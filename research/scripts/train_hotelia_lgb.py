"""Train Hotelia's pre-release LightGBM ranker with serving-parity features.

The generated interactions are isolated research data. They bootstrap the
ranking path before enough consented production outcomes exist; they are never
inserted into Hotelia's bookings, reviews, or recommendation event collections.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

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

CITY_BASE_PRICE = {
    "TP HCM": 950_000, "Hà Nội": 900_000, "Đà Nẵng": 850_000,
    "Nha Trang": 850_000, "Phú Quốc": 1_050_000, "Hội An": 800_000,
    "Hạ Long": 850_000, "Hải Phòng": 700_000, "Lạng Sơn": 600_000,
    "Cần Thơ": 600_000, "Cam Ranh": 850_000, "Huế": 650_000,
    "Quy Nhơn": 700_000, "Đà Lạt": 750_000,
}


def stable_bytes(value: str) -> bytes:
    return hashlib.sha256(value.encode()).digest()


def inferred_stars(name: str) -> int:
    normalized = name.lower()
    premium = ("four seasons", "luxury", "marriott", "sheraton", "anantara",
               "movenpick", "mövenpick", "vinpearl", "flc grand", "flc luxury")
    upscale = ("resort", "spa", "wyndham", "melia", "meliá", "azerai",
               "somerset", "citadines", "muong thanh", "mường thanh", "golden bay")
    return 5 if any(x in normalized for x in premium) else 4 if any(x in normalized for x in upscale) else 3


def inferred_amenities(name: str, city: str, stars: int) -> set[str]:
    normalized = f"{name} {city}".lower()
    values = {"wifi", "restaurant", "front_desk_24h", "housekeeping"}
    if stars >= 4:
        values |= {"pool", "gym", "spa", "airport_transfer"}
    coastal = ("resort", "beach", "nha trang", "phu quoc", "phú quốc", "da nang",
               "đà nẵng", "quy nhon", "quy nhơn", "ha long", "hạ long", "cam ranh")
    if any(x in normalized for x in coastal):
        values |= {"outdoor_pool", "family_friendly"}
    if any(x in normalized for x in ("apartment", "residence", "somerset", "citadines")):
        values |= {"kitchenette", "laundry"}
    return values


def catalog_rows(root: Path) -> list[dict]:
    base = json.loads((root / "backend/data/real-hotels.v1.json").read_text())["hotels"]
    explore = json.loads((root / "backend/data/explore-hotels.v2.json").read_text())["hotels"]
    rows = []
    for index, raw in enumerate(base + explore):
        source = raw["fields"] if "fields" in raw else raw
        name, city = source["name"], source["city"]
        stars = int(source.get("starRating") or inferred_stars(name))
        seed = stable_bytes(f"hotelia-lgbm-v1:{name}")
        base_price = CITY_BASE_PRICE.get(city, 700_000)
        min_price = round(base_price * (0.85 + stars * 0.1 + (seed[0] % 9) * 0.025) / 50_000) * 50_000
        rating = round(3.6 + (seed[1] % 13) * 0.1, 1)
        reviews = 10 + seed[2] % 41
        amenities = set(source.get("amenities") or inferred_amenities(name, city, stars))
        rows.append({
            "id": raw.get("id", f"explore-{index}"), "name": name, "city": city,
            "stars": stars, "price": float(min_price), "rating": rating,
            "reviews": reviews, "amenities": amenities,
        })
    if len(rows) != 100 or len({row["name"] for row in rows}) != 100:
        raise ValueError("Expected 100 unique Hotelia catalog entries")
    return rows


def quality_prior(rating: float, reviews: int) -> float:
    return (reviews * rating + 5 * 3.5) / (reviews + 5) / 5


def feature_row(hotel: dict, mean_price: float, profile: dict, hour: int, weekend: bool) -> list[float]:
    has_history = profile["history_count"] > 0
    if has_history:
        city_affinity = 1.0 if hotel["city"] == profile["city"] else 0.04
        price_affinity = math.exp(-abs(math.log(hotel["price"]) - math.log(profile["price"])))
        star_affinity = max(0.0, 1 - abs(hotel["stars"] - profile["stars"]) / 5)
        union = hotel["amenities"] | profile["amenities"]
        amenity_affinity = len(hotel["amenities"] & profile["amenities"]) / len(union) if union else 0
    else:
        city_affinity = price_affinity = star_affinity = amenity_affinity = 0.0
    angle = 2 * math.pi * hour / 24
    return [
        hotel["price"] / 1_000_000,
        hotel["price"] / mean_price,
        float(hotel["stars"]),
        hotel["rating"],
        math.log1p(hotel["reviews"]),
        float(len(hotel["amenities"])),
        quality_prior(hotel["rating"], hotel["reviews"]),
        city_affinity,
        price_affinity,
        star_affinity,
        amenity_affinity,
        float(profile["history_count"]),
        1.0 if has_history else 0.0,
        math.sin(angle),
        math.cos(angle),
        1.0 if weekend else 0.0,
    ]


def generate_training(catalog: list[dict], queries: int, rng: np.random.Generator):
    by_city: dict[str, list[dict]] = {}
    for hotel in catalog:
        by_city.setdefault(hotel["city"], []).append(hotel)
    cities = sorted(by_city)
    rows, labels, groups, query_ids = [], [], [], []
    for query in range(queries):
        preferred_city = cities[int(rng.integers(len(cities)))]
        preferred = by_city[preferred_city][int(rng.integers(len(by_city[preferred_city])))]
        history_count = int(rng.integers(1, 13)) if rng.random() < 0.76 else 0
        profile = {
            "city": preferred_city,
            "price": preferred["price"] * float(rng.uniform(0.8, 1.25)),
            "stars": preferred["stars"],
            "amenities": set(rng.choice(sorted(preferred["amenities"]),
                                            size=max(1, min(4, len(preferred["amenities"]))),
                                            replace=False).tolist()),
            "history_count": history_count,
        }
        preferred_pool = by_city[preferred_city]
        local_count = min(4, len(preferred_pool))
        local = rng.choice(preferred_pool, size=local_count, replace=False).tolist()
        selected_names = {hotel["name"] for hotel in local}
        rest = [hotel for hotel in catalog if hotel["name"] not in selected_names]
        candidates = local + rng.choice(rest, size=8 - local_count, replace=False).tolist()
        rng.shuffle(candidates)
        mean_price = float(np.mean([hotel["price"] for hotel in candidates]))
        hour = int(rng.integers(24))
        weekend = bool(rng.random() < 2 / 7)
        features = [feature_row(hotel, mean_price, profile, hour, weekend) for hotel in candidates]
        utility = []
        for hotel, feature in zip(candidates, features):
            score = (
                1.75 * feature[7] + 1.0 * feature[8] + 0.65 * feature[9]
                + 0.55 * feature[10] + 0.7 * feature[6] - 0.12 * feature[1]
                + (0.12 if weekend and "family_friendly" in hotel["amenities"] else 0)
                + float(rng.gumbel(0, 0.34))
            )
            utility.append(score)
        clicked = int(np.argmax(utility))
        rows.extend(features)
        labels.extend(1 if position == clicked else 0 for position in range(len(candidates)))
        groups.append(len(candidates))
        query_ids.extend([query] * len(candidates))
    return np.asarray(rows, dtype=np.float32), np.asarray(labels, dtype=np.int8), np.asarray(groups), np.asarray(query_ids)


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


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--queries", type=int, default=8000)
    parser.add_argument("--seed", type=int, default=20261023)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[2]
    rng = np.random.default_rng(args.seed)
    catalog = catalog_rows(root)
    X, y, groups, query_ids = generate_training(catalog, args.queries, rng)
    split_query = int(args.queries * 0.85)
    train_mask, validation_mask = query_ids < split_query, query_ids >= split_query
    train_groups = groups[:split_query]
    validation_groups = groups[split_query:]
    model = lgb.LGBMRanker(
        objective="lambdarank", metric="ndcg", n_estimators=240,
        learning_rate=0.045, num_leaves=24, min_child_samples=35,
        colsample_bytree=0.9, subsample=0.9, subsample_freq=1,
        random_state=args.seed, verbosity=-1,
    )
    model.fit(
        X[train_mask], y[train_mask], group=train_groups,
        eval_set=[(X[validation_mask], y[validation_mask])],
        eval_group=[validation_groups], eval_at=[5, 10],
        callbacks=[lgb.early_stopping(30, verbose=False)],
        feature_name=FEATURE_NAMES,
    )
    validation_scores = model.predict(X[validation_mask], num_iteration=model.best_iteration_)
    quality_index = FEATURE_NAMES.index("quality_prior")
    report = {
        "model": "hotelia-lgbm-v1",
        "version": "hotelia-lgbm-2026-10-23-v1",
        "training_source": "generated_pre_release_interactions",
        "catalog_hotels": len(catalog),
        "queries": args.queries,
        "train_queries": int(len(train_groups)),
        "validation_queries": int(len(validation_groups)),
        "candidates_per_query": 8,
        "features": FEATURE_NAMES,
        "best_iteration": int(model.best_iteration_),
        "quality_baseline": ranking_metrics(X[validation_mask, quality_index], y[validation_mask], validation_groups),
        "lightgbm": ranking_metrics(validation_scores, y[validation_mask], validation_groups),
        "serving": "enabled_with_rule_fallback",
        "limitation": "Replace generated outcomes with consented served/open/booking outcomes before interpreting metrics as production performance.",
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
            {"features": X[validation_mask][index].tolist(), "score": float(validation_scores[index])}
            for index in range(5)
        ],
    }
    research_output = root / "research/data/models/hotelia-lgbm-v1-report.json"
    serving_output = root / "backend/src/recommendations/models/hotelia-lgbm.v1.json"
    research_output.parent.mkdir(parents=True, exist_ok=True)
    serving_output.parent.mkdir(parents=True, exist_ok=True)
    research_output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    serving_output.write_text(json.dumps(artifact, ensure_ascii=False, separators=(",", ":")) + "\n")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
