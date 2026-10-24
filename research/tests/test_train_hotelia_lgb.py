from datetime import datetime, timezone
import json
import math
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from train_hotelia_lgb import (  # noqa: E402
    FEATURE_NAMES, candidate_features, city_key, load_catalog, normalize, vietnam_clock,
)

ROOT = Path(__file__).resolve().parents[2]


def hotel(**overrides):
    base = {"id": "a", "name": "A", "city": "Huế", "stars": 3, "price": 700_000.0,
            "rating": 4.0, "reviews": 10, "amenities": ["Pool", "wifi"]}
    base.update(overrides)
    base["amenity_keys"] = {normalize(value) for value in base["amenities"]}
    base["city_key"] = city_key(base["city"])
    return base


def test_normalize_matches_backend_rules():
    assert normalize("Đà Nẵng") == "danang"
    assert normalize("Outdoor Pool") == normalize("outdoor_pool") == "outdoorpool"
    assert city_key("TP. Hồ Chí Minh") == city_key("Sài Gòn") == "hcm"


def test_clock_uses_vietnam_time():
    assert vietnam_clock(datetime(2026, 10, 23, 13, 30, tzinfo=timezone.utc)) == (20, False)
    assert vietnam_clock(datetime(2026, 10, 23, 18, 0, tzinfo=timezone.utc)) == (1, True)


def test_cold_start_has_no_affinity():
    candidate = hotel()
    features = dict(zip(FEATURE_NAMES, candidate_features(candidate, [candidate], [], 20, False)))
    assert features["has_history"] == 0
    assert features["city_affinity"] == features["price_affinity"] == 0
    assert features["price_relative"] == 1
    assert math.isclose(features["quality_prior"], (10 * 4 + 17.5) / 15 / 5)


def test_history_count_is_capped_like_serving():
    candidate = hotel()
    signals = [{"hotel": candidate, "weight": 1.0}] * 60
    features = dict(zip(FEATURE_NAMES, candidate_features(candidate, [candidate], signals, 0, False)))
    assert features["history_count"] == 50
    assert features["city_affinity"] == features["amenity_affinity"] == 1


def test_snapshot_is_the_served_catalog():
    hotels, meta = load_catalog(ROOT / "research/data/hotelia-catalog-snapshot.json")
    assert len(hotels) == 100 and meta["sha256"]
    assert all(item["price"] and item["price"] > 0 for item in hotels)
    artifact = json.loads((ROOT / "backend/src/recommendations/models/hotelia-lgbm.active.json").read_text())
    assert artifact["report"]["catalog_snapshot"]["sha256"] == meta["sha256"]
