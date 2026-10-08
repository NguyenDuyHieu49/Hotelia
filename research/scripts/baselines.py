"""Leakage-free baselines for the Trivago clickout ranking task.

Each feature row is one candidate in a clickout query. Models are fitted only
on training queries and score every candidate in the held-out queries.
"""

import argparse
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Optional, Tuple

import polars as pl

logger = logging.getLogger(__name__)


@dataclass
class BaselineConfig:
    data_dir: Path
    output_dir: Path
    train_file: str = "train_features.parquet"
    test_file: str = "test_features.parquet"


def _require_columns(df: pl.DataFrame, names: set[str]) -> None:
    missing = names - set(df.columns)
    if missing:
        raise ValueError(f"Candidate rows are missing columns: {sorted(missing)}")


def _valid_queries(df: pl.DataFrame) -> pl.DataFrame:
    """Exclude clickouts whose clicked item was absent from impressions."""
    if "has_label" not in df.columns:
        return df
    return df.filter(pl.col("has_label").fill_null(False))


def _prediction_frame(df: pl.DataFrame, scores: list[float]) -> pl.DataFrame:
    _require_columns(df, {"query_id", "item_id"})
    return df.select([
        pl.col("query_id").cast(pl.Utf8),
        pl.col("item_id").cast(pl.Utf8),
    ]).with_columns([
        pl.col("item_id").alias("reference"),
        pl.Series("score", scores, dtype=pl.Float64),
    ])


class BaselineB0:
    """B0: retain the logged impression order (position 0 is first)."""

    def predict(self, df: pl.DataFrame) -> pl.DataFrame:
        _require_columns(df, {"query_id", "item_id", "position"})
        if df["position"].null_count():
            raise ValueError("B0 requires a position for every candidate")
        return _prediction_frame(df, [-float(pos) for pos in df["position"]])


class BaselineB1:
    """B1: training click frequency for each (city, hotel) pair."""

    def __init__(self):
        self.popularity_scores: Dict[str, Dict[str, float]] = {}

    def fit(self, df: pl.DataFrame) -> "BaselineB1":
        _require_columns(df, {"city", "item_id", "label"})
        positives = _valid_queries(df).filter(pl.col("label") > 0)
        counts = positives.group_by(["city", "item_id"]).len(name="click_count")
        city_totals = counts.group_by("city").agg(
            pl.col("click_count").sum().alias("city_click_count")
        )
        self.popularity_scores = {}
        for row in counts.join(city_totals, on="city").iter_rows(named=True):
            city = str(row["city"])
            item = str(row["item_id"])
            self.popularity_scores.setdefault(city, {})[item] = (
                row["click_count"] / row["city_click_count"]
            )
        return self

    def predict(self, df: pl.DataFrame) -> pl.DataFrame:
        _require_columns(df, {"query_id", "item_id", "city"})
        scores = [
            self._get_score(str(item), str(city))
            for city, item in zip(df["city"], df["item_id"])
        ]
        return _prediction_frame(df, scores)

    def _get_score(self, item: str, city: str) -> float:
        return self.popularity_scores.get(city, {}).get(item, 0.0)


class BaselineB2:
    """B2: city click popularity plus hotel amenity count.

    Amenity metadata is observable independently of click outcomes. The click
    count is learned exclusively from the training split.
    """

    def __init__(self):
        self.city_item_scores: Dict[str, Dict[str, float]] = {}
        self.item_amenities: Dict[str, float] = {}

    def fit(self, df: pl.DataFrame, items_df: Optional[pl.DataFrame] = None) -> "BaselineB2":
        _require_columns(df, {"city", "item_id", "label"})
        self.item_amenities = {}
        if items_df is not None and {"item_id", "amenity_count"} <= set(items_df.columns):
            self.item_amenities = {
                str(item): float(count or 0)
                for item, count in zip(items_df["item_id"], items_df["amenity_count"])
            }
        if "amenity_count" in df.columns:
            for item, count in zip(df["item_id"], df["amenity_count"]):
                if count is not None:
                    self.item_amenities[str(item)] = float(count)

        positives = _valid_queries(df).filter(pl.col("label") > 0)
        counts = positives.group_by(["city", "item_id"]).len(name="click_count")
        city_max = counts.group_by("city").agg(
            pl.col("click_count").max().alias("max_click_count")
        )
        self.city_item_scores = {}
        for row in counts.join(city_max, on="city").iter_rows(named=True):
            city = str(row["city"])
            item = str(row["item_id"])
            popularity = row["click_count"] / row["max_click_count"]
            content = min(max(self.item_amenities.get(item, 0.0), 0.0) / 50.0, 1.0)
            self.city_item_scores.setdefault(city, {})[item] = 0.7 * popularity + 0.3 * content
        return self

    def predict(self, df: pl.DataFrame) -> pl.DataFrame:
        _require_columns(df, {"query_id", "item_id", "city"})
        scores = [
            self._get_score(str(item), str(city))
            for city, item in zip(df["city"], df["item_id"])
        ]
        return _prediction_frame(df, scores)

    def _get_score(self, item: str, city: str) -> float:
        if city not in self.city_item_scores:
            return 0.0
        if item in self.city_item_scores[city]:
            return self.city_item_scores[city][item]
        content = min(max(self.item_amenities.get(item, 0.0), 0.0) / 50.0, 1.0)
        return 0.3 * content


class BaselineRunner:
    def __init__(self, config: BaselineConfig):
        self.config = config

    def load_data(self) -> Tuple[pl.DataFrame, pl.DataFrame]:
        train = _valid_queries(pl.read_parquet(self.config.data_dir / self.config.train_file))
        test = _valid_queries(pl.read_parquet(self.config.data_dir / self.config.test_file))
        logger.info("Train: %s candidate rows; test: %s candidate rows", len(train), len(test))
        return train, test

    def run_baseline_b0(self, test: pl.DataFrame) -> pl.DataFrame:
        return BaselineB0().predict(test)

    def run_baseline_b1(self, train: pl.DataFrame, test: pl.DataFrame) -> pl.DataFrame:
        return BaselineB1().fit(train).predict(test)

    def run_baseline_b2(
        self,
        train: pl.DataFrame,
        test: pl.DataFrame,
        items_df: Optional[pl.DataFrame] = None,
    ) -> pl.DataFrame:
        return BaselineB2().fit(train, items_df).predict(test)

    def run_all(self) -> Dict[str, pl.DataFrame]:
        train, test = self.load_data()
        items_path = self.config.data_dir / "items_features.parquet"
        items_df = pl.read_parquet(items_path) if items_path.exists() else None
        return {
            "B0": self.run_baseline_b0(test),
            "B1": self.run_baseline_b1(train, test),
            "B2": self.run_baseline_b2(train, test, items_df),
        }

    def save_results(self, results: Dict[str, pl.DataFrame]) -> None:
        self.config.output_dir.mkdir(parents=True, exist_ok=True)
        for name, df in results.items():
            path = self.config.output_dir / f"baseline_{name}.parquet"
            df.write_parquet(path)
            logger.info("Saved %s: %s", name, path)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run clickout ranking baselines")
    parser.add_argument("--data-dir", default="data/features")
    parser.add_argument("--output-dir", default="data/baselines")
    args = parser.parse_args()
    base_dir = Path(__file__).parent.parent
    config = BaselineConfig(base_dir / args.data_dir, base_dir / args.output_dir)
    runner = BaselineRunner(config)
    runner.save_results(runner.run_all())


if __name__ == "__main__":
    main()
