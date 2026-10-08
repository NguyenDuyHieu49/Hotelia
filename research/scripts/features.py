"""Build candidate-level ranking features from Trivago click-out events.

Each click-out is one ranking query. Its impressions are the candidates, and
the clicked reference (when known) supplies exactly one positive label. All
behavioral features are computed from actions preceding that click-out.
"""

import json
import logging
from pathlib import Path
from dataclasses import dataclass, field
from typing import List, Dict, Optional

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
        "price", "avg_price", "price_rank", "price_relative", "position",
        "prior_item_interactions"
    ])
    context: List[str] = field(default_factory=lambda: [
        "city_id", "device_type", "platform_encoded", "filter_count"
    ])
    session: List[str] = field(default_factory=lambda: [
        "session_length", "action_count", "click_count", "last_action_type_encoded"
    ])
    temporal: List[str] = field(default_factory=lambda: [
        "hour", "day_of_week", "is_weekend"
    ])
    content: List[str] = field(default_factory=lambda: [
        "star_rating", "amenity_count", "has_luxury", "has_business",
        "has_family", "has_beach", "has_spa", "has_gym"
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

    def extract_item_features(
        self, df: pl.DataFrame, items: Optional[pl.DataFrame] = None,
        source: str = "train",
    ) -> pl.DataFrame:
        """Expand each click-out into one row per aligned impression and price.

        ``source`` must identify the input partition when processing several
        batches: it is combined with the source row ordinal for ``query_id``.
        Malformed click-outs with empty, duplicate, or unaligned impression /
        price lists are discarded rather than pairing an item with the wrong
        price or creating more than one positive for a query.
        """
        logger.info("Expanding click-out impressions...")
        if "_source_row" not in df.columns:
            df = df.with_row_index("_source_row")

        clickouts = df.filter(pl.col("action_type") == "clickout item")
        clickouts = clickouts.with_columns([
            pl.col("impressions").fill_null("").str.split("|").alias("impression_list"),
            pl.col("prices").fill_null("").str.split("|").alias("price_list"),
            pl.concat_str([
                pl.lit(source), pl.col("_source_row").cast(pl.String)
            ], separator=":").alias("query_id"),
            pl.col("reference").cast(pl.String).alias("clicked_item_id"),
        ])
        clickouts = clickouts.with_columns([
            pl.col("impression_list").list.len().alias("candidate_count"),
            pl.col("price_list").list.len().alias("_price_count"),
        ])
        valid = (
            pl.col("impressions").is_not_null()
            & (pl.col("impressions") != "")
            & (pl.col("candidate_count") == pl.col("_price_count"))
            & pl.col("impression_list").list.eval(pl.element() != "").list.all()
            & (pl.col("candidate_count") == pl.col("impression_list").list.unique().list.len())
        )
        dropped = len(clickouts) - clickouts.filter(valid).height
        if dropped:
            logger.warning("Discarding %d click-outs with malformed candidate lists", dropped)
        clickouts = clickouts.filter(valid).with_columns([
            pl.col("price_list")
            .list.eval(pl.element().cast(pl.Float64, strict=False))
            .alias("price_list"),
            pl.col("impression_list")
            .list.contains(pl.col("clicked_item_id"))
            .fill_null(False)
            .alias("has_label"),
        ])
        clickouts = clickouts.with_columns(
            pl.col("price_list").list.mean().alias("avg_price")
        )
        clickouts = (
            clickouts.drop("reference")
            .explode(["impression_list", "price_list"], empty_as_null=True)
            .rename({"impression_list": "item_id", "price_list": "price"})
            .with_columns([
                pl.col("item_id").cast(pl.String),
                pl.col("item_id").cum_count().over("query_id").sub(1)
                .cast(pl.Int32).alias("position"),
            ])
            .with_columns([
                pl.col("item_id").alias("reference"),
                pl.col("price").rank(method="dense").over("query_id")
                .cast(pl.Int32).alias("price_rank"),
                pl.when(pl.col("avg_price") > 0)
                .then(pl.col("price") / pl.col("avg_price"))
                .otherwise(None).alias("price_relative"),
            ])
        )
        return self.build_labels(clickouts)

    def extract_context_features(self, df: pl.DataFrame) -> pl.DataFrame:
        """Extract context-related features."""
        logger.info("Extracting context features...")

        # Encode city as numeric ID
        df = df.with_columns(pl.col("city").hash().alias("city_id"))

        # Encode device type using replace
        df = df.with_columns([
            pl.col("device").replace_strict({"mobile": 0, "desktop": 1, "tablet": 2}, default=99).cast(pl.Int32).alias("device_type")
        ])

        # Encode platform using replace
        df = df.with_columns([
            pl.col("platform").replace_strict({"AU": 0, "CO": 1, "DE": 2, "ES": 3, "FR": 4, "GB": 5, "US": 6}, default=99).cast(pl.Int32).alias("platform_encoded")
        ])

        # Count filters
        df = df.with_columns(
            pl.when(pl.col("current_filters").is_null() | (pl.col("current_filters") == ""))
            .then(0)
            .otherwise(pl.col("current_filters").str.count_matches(r"\|") + 1)
            .cast(pl.Int32).alias("filter_count")
        )

        return df

    def extract_session_features(self, df: pl.DataFrame) -> pl.DataFrame:
        """Compute action counts and last action strictly before each event."""
        logger.info("Extracting past-only session features...")
        if "_source_row" not in df.columns:
            df = df.with_row_index("_source_row")
        session_keys = ["user_id", "session_id"]
        df = df.sort([*session_keys, "timestamp", "step", "_source_row"])
        prior_actions = pl.col("_source_row").cum_count().over(session_keys) - 1
        clickout = (pl.col("action_type") == "clickout item").cast(pl.Int32)
        df = df.with_columns([
            prior_actions.cast(pl.Int32).alias("session_length"),
            prior_actions.cast(pl.Int32).alias("action_count"),
            (clickout.cum_sum().over(session_keys) - clickout)
            .cast(pl.Int32).alias("click_count"),
            pl.col("action_type").shift(1).over(session_keys).alias("last_action_type"),
        ])
        df = df.with_columns(
            pl.col("last_action_type")
            .replace_strict({
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
        )
        return df.sort("_source_row")

    def extract_temporal_features(self, df: pl.DataFrame) -> pl.DataFrame:
        """Extract temporal features from timestamp."""
        logger.info("Extracting temporal features...")

        # Unix timestamps are in UTC seconds; 1970-01-01 was a Thursday.
        df = df.with_columns([
            ((pl.col("timestamp") % 86400) // 3600).cast(pl.Int32).alias("hour"),  # Hour of day (0-23)
        ])
        df = df.with_columns([
            ((pl.col("timestamp") // 86400 + 3) % 7 + 1).cast(pl.Int32).alias("day_of_week"),  # 1=Monday
            (((pl.col("timestamp") // 86400 + 3) % 7 + 1) >= 6).cast(pl.Boolean).alias("is_weekend"),
        ])

        return df

    def extract_content_features(self, items: pl.DataFrame) -> pl.DataFrame:
        """Extract content features from item metadata."""
        logger.info("Extracting content features...")

        # Count amenities
        items = items.with_columns(
            pl.when(pl.col("properties").is_null() | (pl.col("properties") == ""))
            .then(0)
            .otherwise(pl.col("properties").str.split("|").list.len())
            .cast(pl.Int32).alias("amenity_count")
        )

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
                .str.contains(pattern, literal=True)
                .fill_null(False)
                .cast(pl.Int32)
                .alias(f"has_{category}")
            ])

        return items

    def build_labels(self, df: pl.DataFrame) -> pl.DataFrame:
        """Label a candidate iff it matches the click-out's clicked item."""
        logger.info("Building labels...")
        if not {"item_id", "clicked_item_id", "has_label"}.issubset(df.columns):
            raise ValueError("build_labels requires candidate-level rows")
        return df.with_columns(
            pl.when(pl.col("has_label") & (pl.col("item_id") == pl.col("clicked_item_id")))
            .then(1).otherwise(0).cast(pl.Int8).alias("label")
        )

    def build_candidate_rows(
        self, actions: pl.DataFrame, items: Optional[pl.DataFrame] = None,
        source: str = "train",
    ) -> pl.DataFrame:
        """Build the learning-to-rank table for an action partition.

        The caller should pass complete action histories up to each click-out.
        ``has_label=False`` queries are retained for inference and must be
        excluded from supervised training and offline evaluation.
        """
        actions = self.extract_session_features(actions)
        candidates = self.extract_item_features(actions, source=source)
        # Cumulative counts are made from item actions, then joined at the
        # latest strictly earlier action index. The click-out being labeled
        # must never count as its own prior interaction.
        item_action_types = [
            "interaction item image", "interaction item info",
            "interaction item rating", "interaction item deals", "clickout item",
        ]
        by_item = ["user_id", "session_id", "item_id"]
        history = (
            actions.filter(
                pl.col("action_type").is_in(item_action_types)
                & pl.col("reference").is_not_null()
            )
            .with_columns(pl.col("reference").cast(pl.String).alias("item_id"))
            .sort(["user_id", "session_id", "session_length"])
            .with_columns(
                pl.col("item_id").cum_count().over(by_item)
                .cast(pl.Int32).alias("prior_item_interactions")
            )
            .select([*by_item, "session_length", "prior_item_interactions"])
            .sort("session_length")
        )
        candidates = (
            candidates.sort("session_length")
            .join_asof(
                history, on="session_length", by=by_item,
                strategy="backward", allow_exact_matches=False,
            )
            .with_columns(
                pl.col("prior_item_interactions").fill_null(0).cast(pl.Int32)
            )
        )
        candidates = self.extract_context_features(candidates)
        candidates = self.extract_temporal_features(candidates)
        if items is not None:
            content = self.extract_content_features(items)
            content_cols = [
                "item_id", "star_rating", "amenity_count", "has_luxury",
                "has_business", "has_family", "has_beach", "has_spa", "has_gym",
            ]
            content = (
                content.select(content_cols)
                .with_columns(pl.col("item_id").cast(pl.String))
                .unique(subset="item_id", keep="first")
            )
            candidates = candidates.join(content, on="item_id", how="left")
        return candidates.sort(["_source_row", "position"]).drop([
            "_source_row", "_price_count", "impressions", "prices",
        ])

    def transform(self) -> Dict[str, pl.DataFrame]:
        """
        Run full feature engineering pipeline.

        Returns:
            Dictionary with 'train' and 'test' DataFrames with features.
        """
        # Load data
        train, test, items = self.load_data()

        train = self.build_candidate_rows(train, items, source="train")
        test = self.build_candidate_rows(test, items, source="test")
        # A click-out without its clicked item in the candidate list has no
        # valid supervised ranking target. The holdout can retain such rows
        # for inference but they cannot contribute to evaluation metrics.
        train = train.filter(pl.col("has_label"))
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
