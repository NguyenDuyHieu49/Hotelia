"""Train Hotelia's pre-release LightGBM ranker with serving-parity features.

Hotel attributes come from `data/hotelia-catalog-snapshot.json`, exported from
the live recommendations API by `export_hotelia_catalog.py`, so price, stars,
rating, review count and amenities equal the values NestJS scores. Feature
formulas mirror `backend/src/recommendations/lightgbm-ranker.ts`; the artifact
carries feature-level parity cases that the backend test suite recomputes.

User histories and click outcomes are still generated. They bootstrap the
ranking path before enough consented production outcomes exist and are never
inserted into Hotelia's bookings, reviews, or recommendation event collections.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import re
import unicodedata
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Avoid platform-specific physical-core detection warnings in joblib. Training
# below uses one worker so repeated runs produce the same artifact.
os.environ.setdefault("LOKY_MAX_CPU_COUNT", str(os.cpu_count() or 1))

import lightgbm as lgb
import numpy as np


FEATURE_NAMES = [
    "min_price_millions",
    "price_relative",
    "star_rating",
    "rating",
    "review_log",
    "amenity_count",
    "quality_prior",
    "city_affinity",
    "price_affinity",
    "star_affinity",
    "amenity_affinity",
    "history_count",
    "has_history",
    "hour_sin",
    "hour_cos",
    "is_weekend",
]

MODEL_NAME = "hotelia-lgbm-v3"
MODEL_VERSION = "hotelia-lgbm-2026-10-24-v3"
VIETNAM = timezone(timedelta(hours=7))
HCM_ALIASES = {"tphcm", "tphochiminh", "hochiminhcity", "hochiminh", "saigon"}
# Serving reads 90 days of history and caps history_count at 50.
HISTORY_DAYS = 90
MAX_HISTORY = 50


def normalize(value: str) -> str:
    """Port of ranking.ts `normalize`."""
    value = unicodedata.normalize("NFD", value.lower())
    value = "".join(char for char in value if not 0x300 <= ord(char) <= 0x36F)
    return re.sub(r"[^a-z0-9]", "", value.replace("đ", "d").lower())


def city_key(city: str) -> str:
    key = normalize(city)
    return "hcm" if key in HCM_ALIASES else key


def load_catalog(path: Path) -> tuple[list[dict], dict]:
    snapshot = json.loads(path.read_text())
    hotels = snapshot["hotels"]
    if len(hotels) < 20 or len({hotel["id"] for hotel in hotels}) != len(hotels):
        raise ValueError("Catalog snapshot must contain unique hotel IDs")
    for hotel in hotels:
        hotel["amenity_keys"] = {normalize(amenity) for amenity in hotel["amenities"]}
        hotel["city_key"] = city_key(hotel["city"])
    return hotels, {key: snapshot[key] for key in ("source", "fetchedAt", "sha256")}


def quality_prior(hotel: dict) -> float:
    reviews = max(0, hotel["reviews"])
    rating = min(5.0, max(0.0, hotel["rating"]))
    return (reviews * rating + 5 * 3.5) / (reviews + 5) / 5


def jaccard(left: set[str], right: set[str]) -> float:
    union = left | right
    return len(left & right) / len(union) if union else 0.0


def vietnam_clock(now: datetime) -> tuple[int, bool]:
    local = now.astimezone(VIETNAM)
    return local.hour, local.weekday() >= 5


def candidate_features(hotel: dict, candidates: list[dict], signals: list[dict], hour: int, weekend: bool) -> list[float]:
    """Port of lightgbm-ranker.ts `candidateFeatures`."""
    prices = [item["price"] for item in candidates if item["price"] and item["price"] > 0]
    mean_price = sum(prices) / len(prices) if prices else 1.0
    price = hotel["price"] if hotel["price"] and hotel["price"] > 0 else mean_price
    signal_weight = sum(signal["weight"] for signal in signals)

    def weighted(mapper) -> float:
        if not signal_weight:
            return 0.0
        return sum(signal["weight"] * mapper(signal["hotel"]) for signal in signals) / signal_weight

    city_affinity = weighted(lambda other: float(other["city_key"] == hotel["city_key"]))
    target_log_price = weighted(lambda other: math.log(other["price"]) if other["price"] and other["price"] > 0 else math.log(price))
    price_affinity = math.exp(-abs(math.log(price) - target_log_price)) if signal_weight else 0.0
    star_affinity = weighted(lambda other: max(0.0, 1 - abs(other["stars"] - hotel["stars"]) / 5)
                             if other["stars"] > 0 and hotel["stars"] > 0 else 0.0)
    amenity_affinity = weighted(lambda other: jaccard(hotel["amenity_keys"], other["amenity_keys"]))
    angle = 2 * math.pi * hour / 24
    return [
        price / 1_000_000,
        price / mean_price,
        float(max(0, hotel["stars"])),
        max(0.0, hotel["rating"]),
        math.log1p(max(0, hotel["reviews"])),
        float(len(hotel["amenities"])),
        quality_prior(hotel),
        city_affinity,
        price_affinity,
        star_affinity,
        amenity_affinity,
        float(min(MAX_HISTORY, len(signals))),
        1.0 if signal_weight > 0 else 0.0,
        math.sin(angle),
        math.cos(angle),
        1.0 if weekend else 0.0,
    ]


def content_score(hotel: dict, signals: list[dict]) -> float:
    """Port of the ranking.ts fallback score, before its greedy city diversification."""
    weight = sum(signal["weight"] for signal in signals)
    if not weight:
        return quality_prior(hotel)

    def similarity(other: dict) -> float:
        price = min(hotel["price"], other["price"]) / max(hotel["price"], other["price"]) if hotel["price"] and other["price"] else 0
        stars = 1 - abs(hotel["stars"] - other["stars"]) / 5 if hotel["stars"] > 0 and other["stars"] > 0 else 0
        return (0.4 * float(hotel["city_key"] == other["city_key"]) + 0.25 * jaccard(hotel["amenity_keys"], other["amenity_keys"])
                + 0.2 * price + 0.15 * stars)

    affinity = sum(signal["weight"] * similarity(signal["hotel"]) for signal in signals) / weight
    return 0.7 * affinity + 0.3 * quality_prior(hotel)


def sample_history(catalog: list[dict], preferred: dict, rng: np.random.Generator) -> list[dict]:
    if rng.random() >= 0.76:
        return []
    count = int(rng.integers(1, 13)) if rng.random() < 0.7 else int(rng.integers(13, MAX_HISTORY + 1))
    count = min(count, len(catalog))
    preferred_price = preferred["price"] * float(rng.uniform(0.8, 1.25))
    keys = sorted(preferred["amenity_keys"])
    preferred_amenities = set(rng.choice(keys, size=max(1, min(4, len(keys))), replace=False).tolist()) if keys else set()
    scores = np.asarray([
        1.8 * float(item["city_key"] == preferred["city_key"])
        + math.exp(-abs(math.log(item["price"]) - math.log(preferred_price)))
        + 0.6 * (max(0.0, 1 - abs(item["stars"] - preferred["stars"]) / 5) if item["stars"] > 0 and preferred["stars"] > 0 else 0)
        + 0.5 * jaccard(item["amenity_keys"], preferred_amenities)
        for item in catalog
    ])
    probabilities = np.exp(scores - scores.max())
    probabilities /= probabilities.sum()
    hotels = rng.choice(len(catalog), size=count, replace=False, p=probabilities)
    signals = []
    for index in hotels:
        # Confirmed bookings weigh 3; views decay with a 14-day half-life.
        weight = 3.0 if rng.random() < 0.18 else math.pow(0.5, float(rng.uniform(0, HISTORY_DAYS)) / 14)
        signals.append({"hotel": catalog[int(index)], "weight": weight})
    return signals


def sample_candidates(catalog: list[dict], by_city: dict[str, list[dict]], preferred: dict,
                      rng: np.random.Generator) -> tuple[str, list[dict]]:
    """Serving ranks every hotel left after filters, so groups vary in size."""
    mode = rng.random()
    if mode < 0.2:
        return "full_catalog", list(catalog)
    if mode < 0.65:
        city = preferred["city_key"] if rng.random() < 0.8 else sorted(by_city)[int(rng.integers(len(by_city)))]
        if len(by_city[city]) >= 2:
            return "destination", list(by_city[city])
    local_pool = by_city[preferred["city_key"]]
    local = rng.choice(len(local_pool), size=min(4, len(local_pool)), replace=False)
    chosen = {local_pool[int(index)]["id"] for index in local}
    rest = [hotel for hotel in catalog if hotel["id"] not in chosen]
    extra = rng.choice(len(rest), size=8 - len(chosen), replace=False)
    candidates = [local_pool[int(index)] for index in local] + [rest[int(index)] for index in extra]
    order = rng.permutation(len(candidates))
    return "sample_8", [candidates[int(index)] for index in order]


def generate_training(catalog: list[dict], queries: int, rng: np.random.Generator):
    by_city: dict[str, list[dict]] = {}
    for hotel in catalog:
        by_city.setdefault(hotel["city_key"], []).append(hotel)
    cities = sorted(by_city)
    rows, labels, groups, modes, quality, content, oracle = [], [], [], [], [], [], []
    for _ in range(queries):
        preferred_pool = by_city[cities[int(rng.integers(len(cities)))]]
        preferred = preferred_pool[int(rng.integers(len(preferred_pool)))]
        signals = sample_history(catalog, preferred, rng)
        mode, candidates = sample_candidates(catalog, by_city, preferred, rng)
        hour = int(rng.integers(24))
        weekend = bool(rng.random() < 2 / 7)
        features = [candidate_features(hotel, candidates, signals, hour, weekend) for hotel in candidates]
        expected = [
            1.75 * feature[7] + 1.0 * feature[8] + 0.65 * feature[9] + 0.55 * feature[10]
            + 0.7 * feature[6] - 0.12 * feature[1]
            + (0.12 if weekend and "familyfriendly" in hotel["amenity_keys"] else 0)
            for hotel, feature in zip(candidates, features)
        ]
        # Gumbel noise makes the click a softmax choice over expected utility.
        clicked = int(np.argmax([value + float(rng.gumbel(0, 0.34)) for value in expected]))
        oracle.extend(expected)
        rows.extend(features)
        labels.extend(int(position == clicked) for position in range(len(candidates)))
        groups.append(len(candidates))
        modes.append(mode)
        quality.extend(quality_prior(hotel) for hotel in candidates)
        content.extend(content_score(hotel, signals) for hotel in candidates)
    return (np.asarray(rows, dtype=np.float64), np.asarray(labels, dtype=np.int8), np.asarray(groups),
            np.asarray(modes), np.asarray(quality), np.asarray(content), np.asarray(oracle))


def ranking_metrics(scores: np.ndarray, labels: np.ndarray, groups: np.ndarray) -> dict[str, float]:
    totals = {"mrr@10": [], "hit@10": [], "ndcg@10": []}
    start = 0
    for size in groups:
        end = start + int(size)
        order = np.argsort(-scores[start:end], kind="stable")
        rank = int(np.flatnonzero(labels[start:end][order] > 0)[0]) + 1
        totals["mrr@10"].append(1 / rank if rank <= 10 else 0)
        totals["hit@10"].append(float(rank <= 10))
        totals["ndcg@10"].append(1 / math.log2(rank + 1) if rank <= 10 else 0)
        start = end
    return {name: float(np.mean(values)) for name, values in totals.items()}


def grouped_metrics(scores, labels, groups, modes) -> dict:
    offsets = np.concatenate([[0], np.cumsum(groups)])
    result = {"all": {**ranking_metrics(scores, labels, groups), "queries": int(len(groups))}}
    for mode in sorted(set(modes.tolist())):
        picked = np.flatnonzero(modes == mode)
        rows = np.concatenate([np.arange(offsets[i], offsets[i + 1]) for i in picked])
        result[mode] = {**ranking_metrics(scores[rows], labels[rows], groups[picked]),
                        "queries": int(len(picked)), "mean_candidates": float(groups[picked].mean())}
    return result


def feature_parity_cases(catalog: list[dict]) -> list[dict]:
    """Fixed scenarios the backend recomputes field by field."""
    by_id = {hotel["id"]: hotel for hotel in catalog}
    danang = [hotel for hotel in catalog if hotel["city_key"] == city_key("Đà Nẵng")][:5]
    others = [hotel for hotel in catalog if hotel["city_key"] != city_key("Đà Nẵng")][:3]
    candidates = danang + others
    scenarios = [
        # Friday 20:30 in Vietnam, but 13:30 UTC on the server.
        ("2026-10-23T13:30:00Z", [(danang[0]["id"], 3.0), (others[0]["id"], math.pow(0.5, 5 / 14)),
                                  (danang[1]["id"], math.pow(0.5, 40 / 14))]),
        # Saturday 01:00 in Vietnam, still Friday 18:00 UTC; no history.
        ("2026-10-23T18:00:00Z", []),
    ]
    cases = []
    for now, history in scenarios:
        signals = [{"hotel": by_id[hotel_id], "weight": weight} for hotel_id, weight in history]
        hour, weekend = vietnam_clock(datetime.fromisoformat(now.replace("Z", "+00:00")))
        cases.append({
            "now": now,
            "candidates": [{key: hotel[key] for key in ("id", "name", "city", "amenities", "stars", "rating", "reviews", "price")}
                           for hotel in candidates],
            "signals": [{"hotelId": hotel_id, "weight": weight} for hotel_id, weight in history],
            "features": [candidate_features(hotel, candidates, signals, hour, weekend) for hotel in candidates],
        })
    return cases


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--queries", type=int, default=20000)
    parser.add_argument("--seed", type=int, default=20261024)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[2]
    rng = np.random.default_rng(args.seed)
    catalog, snapshot = load_catalog(root / "research/data/hotelia-catalog-snapshot.json")
    X, y, groups, modes, quality, content, oracle = generate_training(catalog, args.queries, rng)
    # 70% train, 15% validation for early stopping, 15% untouched test for reporting.
    train_end, validation_end = int(args.queries * 0.70), int(args.queries * 0.85)
    offsets = np.concatenate([[0], np.cumsum(groups)])
    train_rows = slice(0, offsets[train_end])
    validation_rows = slice(offsets[train_end], offsets[validation_end])
    test_rows = slice(offsets[validation_end], offsets[-1])
    test_groups, test_modes, y_test = groups[validation_end:], modes[validation_end:], y[test_rows]
    model = lgb.LGBMRanker(
        objective="lambdarank", metric="ndcg", n_estimators=1000,
        learning_rate=0.05, num_leaves=31, min_child_samples=50,
        colsample_bytree=0.9, subsample=0.9, subsample_freq=1,
        random_state=args.seed, n_jobs=1, verbosity=-1,
    )
    model.fit(
        X[train_rows], y[train_rows], group=groups[:train_end],
        eval_X=(X[validation_rows],),
        eval_y=(y[validation_rows],),
        eval_group=[groups[train_end:validation_end]], eval_at=[10],
        callbacks=[lgb.early_stopping(50, first_metric_only=True, verbose=False)],
        feature_name=FEATURE_NAMES,
    )
    test_scores = model.booster_.predict(X[test_rows], num_iteration=model.best_iteration_)
    importance = model.booster_.feature_importance(importance_type="gain", iteration=model.best_iteration_)
    report = {
        "model": MODEL_NAME,
        "version": MODEL_VERSION,
        "training_source": "generated_pre_release_interactions_over_live_catalog_snapshot",
        "catalog_snapshot": snapshot,
        "catalog_hotels": len(catalog),
        "queries": args.queries,
        "train_queries": train_end,
        "validation_queries": validation_end - train_end,
        "test_queries": args.queries - validation_end,
        "candidate_groups": {mode: int((modes == mode).sum()) for mode in sorted(set(modes.tolist()))},
        "features": FEATURE_NAMES,
        "best_iteration": int(model.best_iteration_),
        "evaluation_split": "test",
        "quality_baseline": grouped_metrics(quality[test_rows], y_test, test_groups, test_modes),
        "content_fallback": grouped_metrics(content[test_rows], y_test, test_groups, test_modes),
        "lightgbm": grouped_metrics(test_scores, y_test, test_groups, test_modes),
        "oracle_expected_utility": grouped_metrics(oracle[test_rows], y_test, test_groups, test_modes),
        "feature_importance_gain": {name: float(value) for name, value in zip(FEATURE_NAMES, importance)},
        "serving": "enabled_with_rule_fallback",
        "limitation": "Hotel attributes match serving; histories and click outcomes are generated. "
                      "Replace them with consented served/open/booking outcomes before interpreting metrics as production performance.",
    }
    dump = model.booster_.dump_model(num_iteration=model.best_iteration_)
    artifact = {
        "version": report["version"],
        "feature_names": FEATURE_NAMES,
        "tree_info": dump["tree_info"],
        "objective": dump["objective"],
        "average_output": dump.get("average_output", False),
        "report": report,
        "parity_cases": [
            {"features": X[offsets[validation_end] + index].tolist(), "score": float(test_scores[index])}
            for index in range(5)
        ],
        "feature_parity_cases": feature_parity_cases(catalog),
    }
    research_output = root / "research/data/models/hotelia-lgbm-v3-report.json"
    serving_output = root / "backend/src/recommendations/models/hotelia-lgbm.active.json"
    research_output.parent.mkdir(parents=True, exist_ok=True)
    serving_output.parent.mkdir(parents=True, exist_ok=True)
    research_output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    serving_output.write_text(json.dumps(artifact, ensure_ascii=False, separators=(",", ":")) + "\n")
    summary = {name: {mode: {k: round(v, 3) for k, v in values.items() if k in ("mrr@10", "ndcg@10", "hit@10")}
                      for mode, values in report[name].items()}
               for name in ("quality_baseline", "content_fallback", "lightgbm", "oracle_expected_utility")}
    print(json.dumps({"best_iteration": report["best_iteration"], **summary}, indent=1))


if __name__ == "__main__":
    main()
