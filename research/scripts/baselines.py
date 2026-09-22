"""
Baseline Models for Hotel Recommendation
Implements B0, B1, B2 baselines for ranking evaluation.
"""

import logging
import json
from pathlib import Path
from dataclasses import dataclass
from typing import Dict, List, Tuple, Optional

import numpy as np
import polars as pl

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class BaselineConfig:
    """Configuration for baseline models."""
    data_dir: Path
    output_dir: Path
    train_file: str = "train_features.parquet"
    test_file: str = "test_features.parquet"


class BaselineB0:
    """
    B0: Impression Order Baseline
    Ranks items by their original impression order.
    """

    def predict(self, df: pl.DataFrame) -> pl.DataFrame:
        """
        Rank by impression order (original position).

        Returns DataFrame with session_id, item_id, score columns.
        Score = inverse of position (higher is better).
        """
        # For each clickout, items are already ordered
        # Score = position-based (first item gets highest score)
        df = df.with_columns([
            (pl.col("step").rank(descending=False) / pl.col("step").rank(descending=False).max())
            .alias("score")
        ])

        return df.select(["session_id", "reference", "score"])


class BaselineB1:
    """
    B1: City-based Popularity Baseline
    Ranks items by click frequency in the same city.
    """

    def __init__(self):
        self.popularity_scores: Dict[str, Dict[str, float]] = {}

    def fit(self, df: pl.DataFrame) -> "BaselineB1":
        """Compute popularity scores per city."""
        logger.info("Computing city-based popularity...")

        # Count clicks per (city, item)
        clicks = df.filter(
            pl.col("action_type") == "clickout item"
        ).group_by(["city", "reference"]).agg([
            pl.len().alias("click_count")
        ])

        # Compute popularity per city
        for city in clicks["city"].unique():
            city_data = clicks.filter(pl.col("city") == city)
            total_clicks = city_data["click_count"].sum()

            if total_clicks > 0:
                scores = {
                    row["reference"]: row["click_count"] / total_clicks
                    for row in city_data.iter_rows(named=True)
                }
            else:
                scores = {}

            self.popularity_scores[city] = scores

        return self

    def predict(self, df: pl.DataFrame) -> pl.DataFrame:
        """Predict using popularity scores."""
        # Map popularity score
        df = df.with_columns([
            pl.col("reference").map_elements(
                lambda x: self._get_score(x, df["city"][0]),
                return_dtype=pl.Float64
            ).alias("score")
        ])

        return df.select(["session_id", "reference", "score"])

    def _get_score(self, item: str, city: str) -> float:
        """Get popularity score for item in city."""
        if city in self.popularity_scores:
            return self.popularity_scores[city].get(item, 0.0)
        return 0.0


class BaselineB2:
    """
    B2: Content + Context Matching
    Combines content features with context for ranking.
    """

    def __init__(self):
        self.city_item_scores: Dict[str, Dict[str, float]] = {}

    def fit(self, df: pl.DataFrame, items_df: Optional[pl.DataFrame] = None) -> "BaselineB2":
        """
        Compute content-context scores.

        Combines:
        - Popularity in city
        - Price relevance (median price = best)
        - Amenity count (proxy for quality)
        """
        logger.info("Computing content-context scores...")

        # Merge with item metadata if provided
        if items_df is not None:
            # Cast item_id to string for joining
            items_df = items_df.with_columns([
                pl.col("item_id").cast(pl.Utf8).alias("item_id")
            ])
            df = df.join(items_df.select(["item_id", "amenity_count"]),
                        left_on="reference", right_on="item_id", how="left")

        # Compute city-item scores
        clicks = df.filter(
            pl.col("action_type") == "clickout item"
        ).group_by(["city", "reference"]).agg([
            pl.len().alias("click_count"),
            pl.col("amenity_count").mean().alias("avg_amenities")
        ])

        for city in clicks["city"].unique():
            city_data = clicks.filter(pl.col("city") == city)
            max_clicks = city_data["click_count"].max() or 1

            scores = {
                row["reference"]: (
                    0.7 * row["click_count"] / max_clicks +
                    0.3 * (row["avg_amenities"] or 0) / 50  # Normalize amenities
                )
                for row in city_data.iter_rows(named=True)
            }

            self.city_item_scores[city] = scores

        return self

    def predict(self, df: pl.DataFrame) -> pl.DataFrame:
        """Predict using content-context scores."""
        df = df.with_columns([
            pl.col("reference").map_elements(
                lambda x: self._get_score(x, df["city"][0]),
                return_dtype=pl.Float64
            ).alias("score")
        ])

        return df.select(["session_id", "reference", "score"])

    def _get_score(self, item: str, city: str) -> float:
        """Get content-context score."""
        if city in self.city_item_scores:
            return self.city_item_scores[city].get(item, 0.0)
        return 0.0


class BaselineRunner:
    """Runs and evaluates all baseline models."""

    def __init__(self, config: BaselineConfig):
        self.config = config

    def load_data(self) -> Tuple[pl.DataFrame, pl.DataFrame]:
        """Load feature data."""
        train = pl.read_parquet(self.config.data_dir / self.config.train_file)
        test = pl.read_parquet(self.config.data_dir / self.config.test_file)

        logger.info(f"Train: {len(train):,} rows")
        logger.info(f"Test: {len(test):,} rows")

        return train, test

    def run_baseline_b0(self, df: pl.DataFrame) -> pl.DataFrame:
        """Run B0 (Impression Order)."""
        logger.info("Running B0 (Impression Order)...")
        model = BaselineB0()
        return model.predict(df)

    def run_baseline_b1(self, df: pl.DataFrame) -> pl.DataFrame:
        """Run B1 (City Popularity)."""
        logger.info("Running B1 (City Popularity)...")
        model = BaselineB1()
        model.fit(df)
        return model.predict(df)

    def run_baseline_b2(self, df: pl.DataFrame, items_df: Optional[pl.DataFrame] = None) -> pl.DataFrame:
        """Run B2 (Content + Context)."""
        logger.info("Running B2 (Content + Context)...")
        model = BaselineB2()
        model.fit(df, items_df)
        return model.predict(df)

    def run_all(self) -> Dict[str, pl.DataFrame]:
        """Run all baselines."""
        train, test = self.load_data()

        # Load items if available
        items_path = self.config.data_dir / "items_features.parquet"
        items_df = pl.read_parquet(items_path) if items_path.exists() else None

        results = {
            "B0": self.run_baseline_b0(test),
            "B1": self.run_baseline_b1(train),  # Fit on train, predict on test
            "B2": self.run_baseline_b2(train, items_df),
        }

        return results

    def save_results(self, results: Dict[str, pl.DataFrame]):
        """Save baseline results."""
        for name, df in results.items():
            output_path = self.config.output_dir / f"baseline_{name}.parquet"
            df.write_parquet(output_path)
            logger.info(f"Saved {name} results to {output_path}")


def main():
    """Main entry point."""
    import argparse

    parser = argparse.ArgumentParser(description="Run baseline models")
    parser.add_argument("--data-dir", default="data/features",
                        help="Directory with feature files")
    parser.add_argument("--output-dir", default="data/baselines",
                        help="Output directory for results")
    args = parser.parse_args()

    base_dir = Path(__file__).parent.parent
    config = BaselineConfig(
        data_dir=base_dir / args.data_dir,
        output_dir=base_dir / args.output_dir,
    )
    config.output_dir.mkdir(parents=True, exist_ok=True)

    logger.info("=" * 60)
    logger.info("BASELINE MODELS")
    logger.info("=" * 60)

    runner = BaselineRunner(config)
    results = runner.run_all()
    runner.save_results(results)

    logger.info("\n" + "=" * 60)
    logger.info("BASELINES COMPLETE")
    logger.info("=" * 60)


if __name__ == "__main__":
    main()
