"""Tests for DataLoader module."""

import pytest
from pathlib import Path
import polars as pl
import tempfile
import shutil

# Import from scripts directory
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

from data_loader import DataLoader, DataConfig, SchemaValidator, EXPECTED_COLUMNS


@pytest.fixture
def data_dir():
    """Data directory with test data."""
    return Path(__file__).parent.parent / "data" / "raw"


@pytest.fixture
def temp_output():
    """Temporary output directory."""
    tmp = tempfile.mkdtemp()
    yield Path(tmp)
    shutil.rmtree(tmp)


@pytest.fixture
def config(data_dir, temp_output):
    """Test configuration."""
    return DataConfig(
        data_dir=data_dir,
        output_dir=temp_output,
        sample_size=1000
    )


@pytest.fixture
def loader(config):
    """DataLoader instance."""
    return DataLoader(config)


class TestSchemaValidator:
    """Tests for SchemaValidator."""

    def test_validate_correct_schema(self):
        """Test validation passes with correct schema."""
        validator = SchemaValidator(EXPECTED_COLUMNS)

        df = pl.DataFrame({
            "user_id": ["a", "b"],
            "session_id": ["s1", "s2"],
            "timestamp": [1, 2],
            "step": [1, 2],
            "action_type": ["click", "search"],
            "reference": ["item1", "item2"],
            "platform": ["web", "mobile"],
            "city": ["NYC", "LA"],
            "device": ["desktop", "mobile"],
            "current_filters": [None, None],
            "impressions": [None, None],
            "prices": [None, None],
        })

        lf = df.lazy()
        assert validator.validate(lf, "test") is True

    def test_validate_missing_column(self):
        """Test validation fails with missing column."""
        validator = SchemaValidator(EXPECTED_COLUMNS)

        df = pl.DataFrame({
            "user_id": ["a", "b"],
            # Missing other columns
        })

        lf = df.lazy()
        assert validator.validate(lf, "test") is False


class TestDataLoader:
    """Tests for DataLoader."""

    def test_load_train(self, loader):
        """Test loading train data."""
        lf = loader.load_train(sample=True)
        assert isinstance(lf, pl.LazyFrame)

        # Collect and check
        df = lf.collect()
        assert len(df) > 0
        assert "session_id" in df.columns
        assert "action_type" in df.columns

    def test_load_test(self, loader):
        """Test loading test data."""
        lf = loader.load_test(sample=True)
        assert isinstance(lf, pl.LazyFrame)

        df = lf.collect()
        assert len(df) > 0

    def test_load_item_metadata(self, loader):
        """Test loading item metadata."""
        lf = loader.load_item_metadata(sample=True)
        assert isinstance(lf, pl.LazyFrame)

        df = lf.collect()
        assert len(df) > 0
        assert "item_id" in df.columns
        assert "properties" in df.columns

    def test_save_to_parquet(self, loader, temp_output):
        """Test saving to Parquet."""
        lf = loader.load_train(sample=True)
        path = loader.save_to_parquet(lf, "test_output")

        assert path.exists()
        assert path.suffix == ".parquet"

        # Verify can read back
        df = pl.read_parquet(path)
        assert len(df) > 0

    def test_audit(self, loader):
        """Test audit function."""
        lf = loader.load_train(sample=True)
        audit = loader.audit(lf, "train")

        assert "total_rows" in audit
        assert "columns" in audit
        assert "memory_mb" in audit
        assert "unique_sessions" in audit
        assert audit["total_rows"] > 0

    def test_extract_sample(self, loader, temp_output):
        """Test sample extraction."""
        lf = loader.load_train()
        path = loader.extract_sample(lf, "train_sample_test")

        assert path.exists()
        df = pl.read_parquet(path)
        assert len(df) == loader.config.sample_size

    def test_audit_action_types(self, loader):
        """Test action type distribution in audit."""
        lf = loader.load_train(sample=True)
        audit = loader.audit(lf, "train")

        assert "action_type_counts" in audit
        action_counts = audit["action_type_counts"]
        # Polars returns {"action_type": [...], "len": [...]}
        assert "action_type" in action_counts
        assert "len" in action_counts


class TestDataFlow:
    """Integration tests for full data flow."""

    def test_full_ingestion_flow(self, loader, temp_output):
        """Test complete ingestion pipeline."""
        # 1. Load train
        train_lf = loader.load_train(sample=True)
        train_df = train_lf.collect()
        assert len(train_df) > 0

        # 2. Load test
        test_lf = loader.load_test(sample=True)
        test_df = test_lf.collect()
        assert len(test_df) > 0

        # 3. Load items
        item_lf = loader.load_item_metadata(sample=True)
        item_df = item_lf.collect()
        assert len(item_df) > 0

        # 4. Audit
        train_audit = loader.audit(train_lf, "train")
        assert train_audit["total_rows"] > 0

        # 5. Save to parquet
        parquet_path = loader.save_to_parquet(train_lf, "test_train")
        assert parquet_path.exists()

        # 6. Save audit
        audit_path = loader.save_audit_report()
        assert audit_path.exists()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
