"""
Feature Engineering Module for Expedia Hotel Recommendation
Extracts features from raw data for ML ranking models.
"""

import json
import logging
from pathlib import Path
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional

import polars as pl

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class FeatureConfig:
    """Configuration for feature engineering."""
    data_dir: Path
    output_dir: Path
    train_file: str = "train.parquet"
    test_file: str = "test.parquet"
    item_file: str = "item_metadata.parquet"

    def __post_init__(self):
        self.output_dir.mkdir(parents=True, exist_ok=True)


@dataclass
class FeatureGroups:
    """Feature groups with their feature names."""
    item: List[str] = field(default_factory=lambda: [
        "price", "price_rank", "price_relative", "is_clicked"
    ])
    context: List[str] = field(default_factory=lambda: [
        "city_id", "device_type", "platform", "filter_count"
    ])
    session: List[str] = field(default_factory=lambda: [
        "session_length", "action_count", "click_count", "last_action_type"
    ])
    temporal: List[str] = field(default_factory=lambda: [
        "hour", "day_of_week", "is_weekend"
    ])
    content: List[str] = field(default_factory=lambda: [
        "star_rating", "amenity_count", "category"
    ])

    def to_dict(self) -> Dict[str, List[str]]:
        return {
            "item_features": self.item,
            "context_features": self.context,
            "session_features": self.session,
            "temporal_features": self.temporal,
            "content_features": self.content,
        }


class FeatureEngine:
    """
    Feature engineering pipeline for hotel recommendation.
    Extracts item, context, session, temporal, and content features.
    """

    def __init__(self, config: FeatureConfig):
        self.config = config
        self.feature_groups = FeatureGroups()

    def load_data(self) -> tuple[pl.DataFrame, pl.DataFrame, pl.DataFrame]:
        """Load processed Parquet files."""
        logger.info("Loading data...")

        train = pl.read_parquet(self.config.data_dir / self.config.train_file)
        test = pl.read_parquet(self.config.data_dir / self.config.test_file)
        items = pl.read_parquet(self.config.data_dir / self.config.item_file)

        logger.info(f"  Train: {len(train):,} rows")
        logger.info(f"  Test: {len(test):,} rows")
        logger.info(f"  Items: {len(items):,} rows")

        return train, test, items

    def extract_item_features(self, df: pl.DataFrame, items: pl.DataFrame) -> pl.DataFrame:
        """Extract item-related features."""
        logger.info("Extracting item features...")

        # Parse impressions and prices (pipe-separated strings)
        # Each row may have multiple impressions/prices
        df = df.with_columns([
            pl.col("impressions").str.split("|").alias("impression_list"),
            pl.col("prices").str.split("|").alias("price_list"),
        ])

        # For clickout actions, the reference is the clicked item
        # Price of clicked item
        df = df.with_columns([
            pl.when(pl.col("action_type") == "clickout item")
            .then(pl.col("reference"))
            .otherwise(pl.lit(None))
            .alias("clicked_item")
        ])

        # Mark if item was clicked
        df = df.with_columns([
            pl.when(pl.col("action_type") == "clickout item")
            .then(pl.lit(1))
            .otherwise(pl.lit(0))
            .alias("is_clicked")
        ])

        # Price features (for clicked items)
        # Parse price as numeric
        df = df.with_columns([
            pl.col("prices")
            .str.split("|")
            .list.eval(pl.element().cast(pl.Float64))
            .list.mean()
            .alias("avg_price")
        ])

        return df

    def extract_context_features(self, df: pl.DataFrame) -> pl.DataFrame:
        """Extract context-related features."""
        logger.info("Extracting context features...")

        # Encode city as numeric ID
        df = df.with_columns([
            pl.col("city").hash().alias("city_id"),
        ])

        # Encode device type using replace
        df = df.with_columns([
            pl.col("device").replace({"mobile": 0, "desktop": 1, "tablet": 2}, default=99).cast(pl.Int32).alias("device_type")
        ])

        # Encode platform using replace
        df = df.with_columns([
            pl.col("platform").replace({"AU": 0, "CO": 1, "DE": 2, "ES": 3, "FR": 4, "GB": 5, "US": 6}, default=99).cast(pl.Int32).alias("platform_encoded")
        ])

        # Count filters
        df = df.with_columns([
            pl.col("current_filters")
            .str.count_matches("\\|")
            .alias("filter_count")
        ])

        return df

    def extract_session_features(self, df: pl.DataFrame) -> pl.DataFrame:
        """Extract session-based features."""
        logger.info("Extracting session features...")

        # Session aggregations
        session_stats = df.group_by("session_id").agg([
            pl.len().alias("session_length"),
            pl.col("action_type").count().alias("action_count"),
            pl.when(pl.col("action_type") == "clickout item")
            .then(1)
            .otherwise(0)
            .sum()
            .alias("click_count"),
            pl.col("step").max().alias("max_step"),
        ])

        # Merge back
        df = df.join(session_stats, on="session_id", how="left")

        # Last action type
        last_action = df.group_by("session_id").agg([
            pl.col("action_type").last().alias("last_action_type")
        ])
        df = df.join(last_action, on="session_id", how="left")

        # Encode last action using replace
        df = df.with_columns([
            pl.col("last_action_type")
            .replace({
                "clickout item": 0,
                "interaction item image": 1,
                "interaction item info": 2,
                "interaction item rating": 3,
                "interaction item deals": 4,
                "search for item": 5,
                "search for destination": 6,
                "search for poi": 7,
                "filter selection": 8,
                "change of sort order": 9,
            }, default=99)
            .cast(pl.Int32)
            .alias("last_action_type_encoded")
        ])

        return df

    def extract_temporal_features(self, df: pl.DataFrame) -> pl.DataFrame:
        """Extract temporal features from timestamp."""
        logger.info("Extracting temporal features...")

        # Extract temporal components directly from timestamp
        # timestamp is Unix epoch (seconds since 1970)
        import datetime as dt

        # Extract hour and day from timestamp
        df = df.with_columns([
            ((pl.col("timestamp") % 86400) // 3600).cast(pl.Int32).alias("hour"),  # Hour of day (0-23)
        ])

        # For day of week, we need a reference date
        # Unix epoch 1970-01-01 is Thursday (day 4 in Python's Monday=0)
        # So we adjust: (timestamp_seconds / seconds_per_day + 4) % 7 + 1
        df = df.with_columns([
            ((pl.col("timestamp") // 86400 + 4) % 7 + 1).cast(pl.Int32).alias("day_of_week"),  # 1=Monday
            (((pl.col("timestamp") // 86400 + 4) % 7 + 1) >= 6).cast(pl.Boolean).alias("is_weekend"),  # Saturday=6, Sunday=7
        ])

        return df

    def extract_content_features(self, items: pl.DataFrame) -> pl.DataFrame:
        """Extract content features from item metadata."""
        logger.info("Extracting content features...")

        # Count amenities
        items = items.with_columns([
            pl.col("properties")
            .str.split("|")
            .list.len()
            .alias("amenity_count")
        ])

        # Extract star rating
        items = items.with_columns([
            pl.col("properties")
            .str.extract(r"(\d+) Star", 1)
            .cast(pl.Int32)
            .alias("star_rating")
        ])

        # Extract category (hotel type)
        category_patterns = [
            ("Luxury Hotel", "luxury"),
            ("Business Hotel", "business"),
            ("Family Friendly", "family"),
            ("Beach", "beach"),
            ("Spa", "spa"),
            ("Gym", "gym"),
        ]

        for pattern, category in category_patterns:
            items = items.with_columns([
                pl.col("properties")
                .str.contains(pattern)
                .cast(pl.Int32)
                .alias(f"has_{category}")
            ])

        return items

    def build_labels(self, df: pl.DataFrame) -> pl.DataFrame:
        """Build labels for ranking task."""
        logger.info("Building labels...")

        # For clickout actions, the reference is the target
        # Label = 1 if this is the clicked item in a clickout
        df = df.with_columns([
            pl.when(pl.col("action_type") == "clickout item")
            .then(pl.lit(1))
            .otherwise(pl.lit(0))
            .alias("label")
        ])

        return df

    def transform(self) -> Dict[str, pl.DataFrame]:
        """
        Run full feature engineering pipeline.

        Returns:
            Dictionary with 'train' and 'test' DataFrames with features.
        """
        # Load data
        train, test, items = self.load_data()

        # Extract item features
        train = self.extract_item_features(train, items)
        test = self.extract_item_features(test, items)

        # Extract context features
        train = self.extract_context_features(train)
        test = self.extract_context_features(test)

        # Extract session features
        train = self.extract_session_features(train)
        test = self.extract_session_features(test)

        # Extract temporal features
        train = self.extract_temporal_features(train)
        test = self.extract_temporal_features(test)

        # Build labels
        train = self.build_labels(train)
        test = self.build_labels(test)

        # Extract content features (for items)
        items = self.extract_content_features(items)

        return {
            "train": train,
            "test": test,
            "items": items,
        }

    def save_features(self, features: Dict[str, pl.DataFrame]):
        """Save engineered features to Parquet."""
        logger.info("Saving features...")

        for name, df in features.items():
            output_path = self.config.output_dir / f"{name}_features.parquet"
            df.write_parquet(output_path)
            logger.info(f"  {name}: {len(df):,} rows, {output_path}")

    def save_feature_config(self):
        """Save feature groups configuration."""
        config_path = self.config.output_dir / "feature_groups.json"

        config = {
            "feature_groups": self.feature_groups.to_dict(),
            "total_features": sum(len(v) for v in self.feature_groups.to_dict().values()),
        }

        with open(config_path, 'w') as f:
            json.dump(config, f, indent=2)

        logger.info(f"Feature config saved to {config_path}")


def main():
    """Main entry point."""
    import argparse

    parser = argparse.ArgumentParser(description="Feature engineering")
    parser.add_argument("--data-dir", default="data/processed",
                        help="Directory with processed Parquet files")
    parser.add_argument("--output-dir", default="data/features",
                        help="Output directory for features")
    args = parser.parse_args()

    # Setup paths
    base_dir = Path(__file__).parent.parent
    config = FeatureConfig(
        data_dir=base_dir / args.data_dir,
        output_dir=base_dir / args.output_dir,
    )

    logger.info("=" * 60)
    logger.info("FEATURE ENGINEERING")
    logger.info("=" * 60)

    # Initialize engine
    engine = FeatureEngine(config)

    # Transform data
    features = engine.transform()

    # Save features
    engine.save_features(features)

    # Save config
    engine.save_feature_config()

    logger.info("\n" + "=" * 60)
    logger.info("FEATURE ENGINEERING COMPLETE")
    logger.info("=" * 60)

    # Print summary
    logger.info("\nFeature Groups:")
    for group, feat_list in engine.feature_groups.to_dict().items():
        logger.info(f"  {group}: {len(feat_list)} features")


if __name__ == "__main__":
    main()
