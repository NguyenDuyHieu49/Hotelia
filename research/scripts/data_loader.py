"""
Data Ingestion Module for Expedia Hotel Recommendation
Loads 2GB CSV files into memory-efficient format with schema validation.
"""

import json
import logging
from pathlib import Path
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

import polars as pl

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Expected columns for train/test files
EXPECTED_COLUMNS = [
    "user_id", "session_id", "timestamp", "step", "action_type",
    "reference", "platform", "city", "device", "current_filters",
    "impressions", "prices"
]

# Expected columns for item metadata
ITEM_METADATA_COLUMNS = ["item_id", "properties"]


@dataclass
class DataConfig:
    """Configuration for data paths."""
    data_dir: Path
    output_dir: Path
    sample_size: int = 100_000

    def __post_init__(self):
        self.output_dir.mkdir(parents=True, exist_ok=True)


class SchemaValidator:
    """Validates data schema against expected columns."""

    def __init__(self, expected_columns: list[str]):
        self.expected_columns = set(expected_columns)

    def validate(self, df: pl.LazyFrame, name: str = "data") -> bool:
        """Validate LazyFrame schema."""
        schema = df.collect_schema()
        actual_columns = set(schema.names())

        missing = self.expected_columns - actual_columns
        extra = actual_columns - self.expected_columns

        if missing:
            logger.error(f"[{name}] Missing columns: {missing}")
            return False
        if extra:
            logger.warning(f"[{name}] Extra columns: {extra}")

        logger.info(f"[{name}] Schema validation passed")
        return True

    def get_dtype_map(self) -> dict[str, pl.DataType]:
        """Return expected dtype mapping."""
        return {
            "user_id": pl.Utf8,
            "session_id": pl.Utf8,
            "timestamp": pl.Int64,
            "step": pl.Int32,
            "action_type": pl.Utf8,
            "reference": pl.Utf8,
            "platform": pl.Utf8,
            "city": pl.Utf8,
            "device": pl.Utf8,
            "current_filters": pl.Utf8,
            "impressions": pl.Utf8,
            "prices": pl.Utf8,
        }


class DataLoader:
    """
    Memory-efficient data loader using Polars lazy evaluation.
    Supports CSV to Parquet conversion with schema validation.
    """

    def __init__(self, config: DataConfig):
        self.config = config
        self.validator = SchemaValidator(EXPECTED_COLUMNS)
        self.item_validator = SchemaValidator(ITEM_METADATA_COLUMNS)
        self.audit_results = {}

    def load_csv_lazy(self, filename: str, sample: bool = False) -> pl.LazyFrame:
        """
        Load CSV file with lazy evaluation.

        Args:
            filename: Name of CSV file in data_dir
            sample: If True, load only first sample_size rows

        Returns:
            LazyFrame for memory-efficient processing
        """
        filepath = self.config.data_dir / filename
        logger.info(f"Loading {filepath}...")

        if not filepath.exists():
            raise FileNotFoundError(f"File not found: {filepath}")

        # Define dtypes for proper parsing
        dtype_map = {
            "timestamp": pl.Int64,
            "step": pl.Int32,
        }

        lf = pl.scan_csv(
            filepath,
            schema_overrides=dtype_map,
            try_parse_dates=False,
            ignore_errors=True,
        )

        if sample:
            lf = lf.head(self.config.sample_size)
            logger.info(f"  -> Sampled {self.config.sample_size:,} rows")

        return lf

    def load_train(self, sample: bool = False) -> pl.LazyFrame:
        """Load training data."""
        return self.load_csv_lazy("train.csv", sample=sample)

    def load_test(self, sample: bool = False) -> pl.LazyFrame:
        """Load test data."""
        return self.load_csv_lazy("test.csv", sample=sample)

    def load_item_metadata(self, sample: bool = False) -> pl.LazyFrame:
        """Load item metadata."""
        filepath = self.config.data_dir / "item_metadata.csv"
        logger.info(f"Loading {filepath}...")

        if not filepath.exists():
            raise FileNotFoundError(f"File not found: {filepath}")

        lf = pl.scan_csv(filepath)

        if sample:
            lf = lf.head(self.config.sample_size)

        return lf

    def save_to_parquet(self, lf: pl.LazyFrame, name: str) -> Path:
        """
        Save LazyFrame to Parquet format.

        Args:
            lf: LazyFrame to save
            name: Output filename (without extension)

        Returns:
            Path to saved Parquet file
        """
        output_path = self.config.output_dir / f"{name}.parquet"
        logger.info(f"Saving to {output_path}...")

        # Collect and save
        df = lf.collect()
        df.write_parquet(output_path)

        size_mb = output_path.stat().st_size / (1024 * 1024)
        logger.info(f"  -> Saved {len(df):,} rows, {size_mb:.1f} MB")

        return output_path

    def extract_sample(self, lf: pl.LazyFrame, name: str) -> Path:
        """Extract sample and save to Parquet."""
        sample_lf = lf.head(self.config.sample_size)
        return self.save_to_parquet(sample_lf, f"{name}_sample")

    def audit(self, lf: pl.LazyFrame, name: str) -> dict:
        """
        Generate data audit report.

        Returns:
            Dictionary with audit statistics
        """
        logger.info(f"Running audit on {name}...")

        df = lf.collect()

        audit = {
            "dataset": name,
            "timestamp": datetime.now().isoformat(),
            "total_rows": len(df),
            "total_columns": len(df.columns),
            "columns": list(df.columns),
            "memory_mb": df.estimated_size() / (1024 * 1024),
        }

        # Per-column stats
        column_stats = {}
        for col in df.columns:
            col_stats = {
                "dtype": str(df[col].dtype),
                "null_count": df[col].null_count(),
                "unique_count": df[col].n_unique(),
            }

            # Numeric stats
            if df[col].dtype in [pl.Int64, pl.Int32, pl.Float64]:
                col_stats.update({
                    "min": df[col].min(),
                    "max": df[col].max(),
                    "mean": float(df[col].mean()),
                })

            # String stats
            elif df[col].dtype == pl.Utf8:
                col_stats["avg_length"] = float(df[col].str.len_chars().mean())

            column_stats[col] = col_stats

        audit["column_stats"] = column_stats

        # Key metrics
        if "session_id" in df.columns:
            audit["unique_sessions"] = df["session_id"].n_unique()
        if "user_id" in df.columns:
            audit["unique_users"] = df["user_id"].n_unique()
        if "action_type" in df.columns:
            audit["action_type_counts"] = (
                df.group_by("action_type")
                .len()
                .to_dict()
            )

        self.audit_results[name] = audit
        return audit

    def save_audit_report(self) -> Path:
        """Save audit report to JSON."""
        output_path = self.config.output_dir / "audit_report.json"
        with open(output_path, 'w') as f:
            json.dump(self.audit_results, f, indent=2, default=str)
        logger.info(f"Audit report saved to {output_path}")
        return output_path


def main():
    """Main entry point for data ingestion."""
    import argparse

    parser = argparse.ArgumentParser(description="Ingest Expedia data")
    parser.add_argument("--data-dir", default="data/raw",
                        help="Directory containing CSV files")
    parser.add_argument("--output-dir", default="data/processed",
                        help="Output directory for Parquet files")
    parser.add_argument("--sample-size", type=int, default=100_000,
                        help="Number of rows for sample")
    parser.add_argument("--skip-sample", action="store_true",
                        help="Skip sample extraction")
    args = parser.parse_args()

    # Setup config
    base_dir = Path(__file__).parent.parent
    config = DataConfig(
        data_dir=base_dir / args.data_dir,
        output_dir=base_dir / args.output_dir,
        sample_size=args.sample_size,
    )

    logger.info("=" * 60)
    logger.info("EXPEDIA DATA INGESTION")
    logger.info("=" * 60)

    # Initialize loader
    loader = DataLoader(config)

    # 1. Load and validate train data
    logger.info("\n[1/6] Processing train.csv...")
    train_lf = loader.load_train(sample=True)
    loader.audit(train_lf, "train")
    loader.save_to_parquet(train_lf, "train")
    if not args.skip_sample:
        loader.extract_sample(train_lf, "train")

    # 2. Load and validate test data
    logger.info("\n[2/6] Processing test.csv...")
    test_lf = loader.load_test(sample=True)
    loader.audit(test_lf, "test")
    loader.save_to_parquet(test_lf, "test")

    # 3. Load item metadata
    logger.info("\n[3/6] Processing item_metadata.csv...")
    item_lf = loader.load_item_metadata(sample=True)
    loader.audit(item_lf, "item_metadata")
    loader.save_to_parquet(item_lf, "item_metadata")

    # 4. Save audit report
    logger.info("\n[4/6] Saving audit report...")
    audit_path = loader.save_audit_report()

    # 5. Print summary
    logger.info("\n" + "=" * 60)
    logger.info("INGESTION COMPLETE")
    logger.info("=" * 60)
    for name, audit in loader.audit_results.items():
        logger.info(f"  {name}: {audit['total_rows']:,} rows, "
                    f"{audit['memory_mb']:.1f} MB")

    logger.info(f"\nOutputs saved to: {config.output_dir}")
    logger.info(f"Audit report: {audit_path}")


if __name__ == "__main__":
    main()
