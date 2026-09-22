"""Tests for Feature Engineering module."""

import pytest
from pathlib import Path
import polars as pl
import tempfile
import shutil

import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

from features import FeatureEngine, FeatureConfig, FeatureGroups


@pytest.fixture
def data_dir():
    """Data directory with processed Parquet files."""
    return Path(__file__).parent.parent / "data" / "processed"


@pytest.fixture
def temp_output():
    """Temporary output directory."""
    tmp = tempfile.mkdtemp()
    yield Path(tmp)
    shutil.rmtree(tmp)


@pytest.fixture
def config(data_dir, temp_output):
    """Test configuration."""
    return FeatureConfig(
        data_dir=data_dir,
        output_dir=temp_output,
    )


@pytest.fixture
def engine(config):
    """FeatureEngine instance."""
    return FeatureEngine(config)


class TestFeatureGroups:
    """Tests for FeatureGroups dataclass."""

    def test_feature_groups_structure(self):
        """Test FeatureGroups has all expected groups."""
        groups = FeatureGroups()

        assert hasattr(groups, 'item')
        assert hasattr(groups, 'context')
        assert hasattr(groups, 'session')
        assert hasattr(groups, 'temporal')
        assert hasattr(groups, 'content')

    def test_feature_groups_to_dict(self):
        """Test conversion to dictionary."""
        groups = FeatureGroups()
        d = groups.to_dict()

        assert "item_features" in d
        assert "context_features" in d
        assert "session_features" in d
        assert "temporal_features" in d
        assert "content_features" in d

    def test_feature_counts(self):
        """Test expected feature counts."""
        groups = FeatureGroups()
        d = groups.to_dict()

        # Check specific features
        assert "price" in d["item_features"]
        assert "city_id" in d["context_features"]
        assert "session_length" in d["session_features"]
        assert "hour" in d["temporal_features"]
        assert "amenity_count" in d["content_features"]


class TestFeatureEngine:
    """Tests for FeatureEngine."""

    def test_load_data(self, engine):
        """Test data loading."""
        train, test, items = engine.load_data()

        assert isinstance(train, pl.DataFrame)
        assert isinstance(test, pl.DataFrame)
        assert isinstance(items, pl.DataFrame)
        assert len(train) > 0
        assert len(test) > 0
        assert len(items) > 0

    def test_extract_item_features(self, engine):
        """Test item feature extraction."""
        train, _, _ = engine.load_data()
        _, _, items = engine.load_data()

        result = engine.extract_item_features(train, items)

        assert "is_clicked" in result.columns
        assert "impression_list" in result.columns
        assert "price_list" in result.columns

    def test_extract_context_features(self, engine):
        """Test context feature extraction."""
        train, _, _ = engine.load_data()

        result = engine.extract_context_features(train)

        assert "city_id" in result.columns
        assert "device_type" in result.columns
        assert "filter_count" in result.columns

    def test_extract_session_features(self, engine):
        """Test session feature extraction."""
        train, _, _ = engine.load_data()

        result = engine.extract_session_features(train)

        assert "session_length" in result.columns
        assert "action_count" in result.columns
        assert "click_count" in result.columns
        assert "last_action_type" in result.columns

    def test_extract_temporal_features(self, engine):
        """Test temporal feature extraction."""
        train, _, _ = engine.load_data()

        result = engine.extract_temporal_features(train)

        assert "hour" in result.columns
        assert "day_of_week" in result.columns
        assert "is_weekend" in result.columns

    def test_extract_content_features(self, engine):
        """Test content feature extraction."""
        _, _, items = engine.load_data()

        result = engine.extract_content_features(items)

        assert "amenity_count" in result.columns
        assert "star_rating" in result.columns

    def test_build_labels(self, engine):
        """Test label construction."""
        train, _, _ = engine.load_data()

        result = engine.build_labels(train)

        assert "label" in result.columns
        # Labels should be 0 or 1
        assert result["label"].max() <= 1


class TestFeaturePipeline:
    """Integration tests for full feature pipeline."""

    def test_full_transform(self, engine):
        """Test complete feature engineering pipeline."""
        features = engine.transform()

        assert "train" in features
        assert "test" in features
        assert "items" in features

        train = features["train"]

        # Check all feature groups exist
        assert "is_clicked" in train.columns
        assert "city_id" in train.columns
        assert "session_length" in train.columns
        assert "hour" in train.columns

    def test_save_features(self, engine, temp_output):
        """Test saving features to Parquet."""
        features = engine.transform()
        engine.save_features(features)

        # Check files exist
        assert (temp_output / "train_features.parquet").exists()
        assert (temp_output / "test_features.parquet").exists()
        assert (temp_output / "items_features.parquet").exists()

    def test_save_feature_config(self, engine, temp_output):
        """Test saving feature configuration."""
        engine.save_feature_config()

        config_path = temp_output / "feature_groups.json"
        assert config_path.exists()

        import json
        with open(config_path) as f:
            config = json.load(f)

        assert "feature_groups" in config
        assert "total_features" in config


class TestFeatureValues:
    """Tests for feature value ranges and distributions."""

    def test_device_encoding(self, engine):
        """Test device type encoding."""
        train, _, _ = engine.load_data()
        result = engine.extract_context_features(train)

        # Should be 0, 1, 2 or null
        device_vals = result["device_type"].drop_nulls().unique()
        for v in device_vals:
            assert v in [0, 1, 2]

    def test_temporal_ranges(self, engine):
        """Test temporal feature ranges."""
        train, _, _ = engine.load_data()
        result = engine.extract_temporal_features(train)

        # Hour should be 0-23
        assert result["hour"].min() >= 0
        assert result["hour"].max() <= 23

        # Day of week should be 1-7
        assert result["day_of_week"].min() >= 1
        assert result["day_of_week"].max() <= 7

        # is_weekend should be boolean
        assert result["is_weekend"].dtype == pl.Boolean

    def test_label_values(self, engine):
        """Test label values are valid."""
        train, _, _ = engine.load_data()
        result = engine.build_labels(train)

        # Labels should be 0 or 1
        unique_labels = result["label"].unique().to_list()
        for label in unique_labels:
            assert label in [0, 1]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
