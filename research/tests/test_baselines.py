"""Baselines must score held-out candidates without using their labels."""

from pathlib import Path
import sys

import polars as pl
import pytest

sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

from baselines import BaselineB0, BaselineB1, BaselineB2, BaselineConfig, BaselineRunner
from evaluate import Evaluator


def candidate_frame(query_id: str, city: str, clicked: str, items=("a", "b")) -> pl.DataFrame:
    return pl.DataFrame({
        "query_id": [query_id] * len(items),
        "item_id": list(items),
        "reference": list(items),
        "city": [city] * len(items),
        "position": list(range(len(items))),
        "label": [int(item == clicked) for item in items],
        "has_label": [True] * len(items),
        "amenity_count": [10 if item == "a" else 30 for item in items],
    })


@pytest.fixture
def train():
    return pl.concat([
        candidate_frame("train-1", "Hanoi", "a"),
        candidate_frame("train-2", "Hanoi", "a"),
        candidate_frame("train-3", "Hanoi", "b"),
        candidate_frame("train-4", "Danang", "b"),
    ])


@pytest.fixture
def test():
    # The test label intentionally contradicts train popularity.
    return pl.concat([
        candidate_frame("test-1", "Hanoi", "b"),
        candidate_frame("test-2", "Danang", "a"),
    ])


def score_for(df: pl.DataFrame, query: str, item: str) -> float:
    return df.filter((pl.col("query_id") == query) & (pl.col("item_id") == item))["score"][0]


class TestBaselineB0:
    def test_original_impression_position(self, test):
        shuffled = test.sort("item_id", descending=True)
        result = BaselineB0().predict(shuffled)
        assert score_for(result, "test-1", "a") > score_for(result, "test-1", "b")
        assert result.select(["query_id", "item_id"]).rows() == shuffled.select(["query_id", "item_id"]).rows()

    def test_rejects_absent_position(self, test):
        with pytest.raises(ValueError, match="position"):
            BaselineB0().predict(test.drop("position"))


class TestBaselineB1:
    def test_train_only_city_popularity(self, train, test):
        model = BaselineB1().fit(train)
        predictions = model.predict(test)
        assert score_for(predictions, "test-1", "a") == pytest.approx(2 / 3)
        assert score_for(predictions, "test-1", "b") == pytest.approx(1 / 3)
        assert score_for(predictions, "test-2", "b") == 1.0
        assert len(predictions) == len(test)

    def test_unknown_city(self, train):
        assert BaselineB1().fit(train)._get_score("a", "Unknown") == 0.0


class TestBaselineB2:
    def test_train_only_popularity_and_metadata(self, train, test):
        model = BaselineB2().fit(train)
        predictions = model.predict(test)
        assert score_for(predictions, "test-1", "a") > score_for(predictions, "test-1", "b")
        assert len(predictions) == len(test)
        assert model._get_score("a", "Unknown") == 0.0


class TestBaselineRunner:
    def test_run_all_scores_only_test_queries(self, tmp_path, train, test):
        features = tmp_path / "features"
        features.mkdir()
        train.write_parquet(features / "train_features.parquet")
        test.write_parquet(features / "test_features.parquet")
        runner = BaselineRunner(BaselineConfig(features, tmp_path / "predictions"))
        predictions = runner.run_all()
        assert set(predictions) == {"B0", "B1", "B2"}
        for result in predictions.values():
            assert len(result) == len(test)
            assert set(result["query_id"]) == {"test-1", "test-2"}
            assert Evaluator([2]).evaluate_baseline(
                "baseline", result, test.select(["query_id", "item_id", "position", "label"])
            )["queries"] == 2
        assert score_for(predictions["B1"], "test-1", "a") > score_for(predictions["B1"], "test-1", "b")
        runner.save_results(predictions)
        assert sorted(path.name for path in (tmp_path / "predictions").glob("*.parquet")) == [
            "baseline_B0.parquet", "baseline_B1.parquet", "baseline_B2.parquet",
        ]

    def test_ignores_unlabeled_queries(self, tmp_path, train, test):
        invalid = candidate_frame("invalid", "Hanoi", "a").with_columns(
            pl.lit(False).alias("has_label")
        )
        features = tmp_path / "features"
        features.mkdir()
        pl.concat([train, invalid]).write_parquet(features / "train_features.parquet")
        pl.concat([test, invalid]).write_parquet(features / "test_features.parquet")
        result = BaselineRunner(BaselineConfig(features, tmp_path / "out")).run_all()
        assert all(len(predictions) == len(test) for predictions in result.values())
