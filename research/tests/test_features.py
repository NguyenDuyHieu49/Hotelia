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
        """The model feature manifest must not expose its training target."""
        groups = FeatureGroups()
        d = groups.to_dict()

        # Check specific features
        assert "price" in d["item_features"]
        assert "position" in d["item_features"]
        assert "city_id" in d["context_features"]
        assert "session_length" in d["session_features"]
        assert "hour" in d["temporal_features"]
        assert "amenity_count" in d["content_features"]
        assert not {"label", "is_clicked", "clicked_item_id"} & {
            name for names in d.values() for name in names
        }


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
        """A click-out expands to candidate rows with aligned prices."""
        train, _, _ = engine.load_data()
        result = engine.extract_item_features(train)

        assert "item_id" in result.columns
        assert "query_id" in result.columns
        assert "position" in result.columns
        assert "price" in result.columns
        assert "label" in result.columns
        assert "is_clicked" not in result.columns
        assert result["query_id"].n_unique() > 0

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
        """A candidate matching the clicked reference receives the positive label."""
        train, _, _ = engine.load_data()
        result = engine.extract_item_features(train)

        assert result["label"].max() == 1
        assert result["label"].min() == 0
        assert result.filter(pl.col("has_label")).group_by("query_id").agg(
            pl.col("label").sum().alias("positives")
        )["positives"].unique().to_list() == [1]
        with pytest.raises(ValueError, match="candidate-level"):
            engine.build_labels(train)


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
        assert "query_id" in train.columns
        assert "item_id" in train.columns
        assert "label" in train.columns
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
        result = engine.extract_item_features(train)

        # Labels should be 0 or 1
        unique_labels = result["label"].unique().to_list()
        for label in unique_labels:
            assert label in [0, 1]


@pytest.fixture
def ranking_actions():
    """Two click-outs in one session plus an unlabeled inference query."""
    return pl.DataFrame({
        "user_id": ["u", "u", "u", "u", "u", "v"],
        "session_id": ["s", "s", "s", "s", "s", "s"],
        "timestamp": [100, 110, 120, 130, 140, 150],
        "step": [1, 2, 3, 4, 5, 1],
        "action_type": [
            "search for destination", "clickout item", "interaction item image",
            "clickout item", "clickout item", "clickout item",
        ],
        "reference": ["Hanoi", "B", "C", "C", None, "B"],
        "platform": ["US"] * 6,
        "city": ["Hanoi"] * 6,
        "device": ["mobile"] * 6,
        "current_filters": [None, "Wifi|Pool", None, None, None, None],
        "impressions": [None, "A|B|C", None, "C|A", "A|B", "A|B"],
        "prices": [None, "100|50|75", None, "80|90", "20|30", "30|40"],
    })


class TestCandidateRankingTable:
    def test_one_group_per_clickout_and_aligned_item_features(self, engine, ranking_actions):
        items = pl.DataFrame({
            "item_id": ["A", "B"],
            "properties": ["4 Star|Beach|Wifi", "3 Star|Business Hotel"],
        })
        result = engine.build_candidate_rows(ranking_actions, items, source="toy")

        assert result.height == 9
        assert result["query_id"].n_unique() == 4
        first = result.filter(pl.col("query_id") == "toy:1").sort("position")
        assert first["item_id"].to_list() == ["A", "B", "C"]
        assert first["reference"].to_list() == ["A", "B", "C"]
        assert first["price"].to_list() == [100.0, 50.0, 75.0]
        assert first["position"].to_list() == [0, 1, 2]
        assert first["price_rank"].to_list() == [3, 1, 2]
        assert first["label"].to_list() == [0, 1, 0]
        assert first["avg_price"].to_list() == [75.0] * 3
        assert first["price_relative"][1] == pytest.approx(50 / 75)
        assert first["filter_count"].to_list() == [2] * 3
        assert first["prior_item_interactions"].to_list() == [0, 0, 0]
        assert first["star_rating"].to_list() == [4, 3, None]
        assert first["has_beach"].to_list() == [1, 0, None]

        second = result.filter(pl.col("query_id") == "toy:3").sort("position")
        assert second["item_id"].to_list() == ["C", "A"]
        assert second["prior_item_interactions"].to_list() == [1, 0]
        third = result.filter(pl.col("query_id") == "toy:4").sort("position")
        assert third["prior_item_interactions"].to_list() == [0, 1]
        other_user = result.filter(pl.col("query_id") == "toy:5").sort("position")
        assert other_user["prior_item_interactions"].to_list() == [0, 0]

        positives = result.group_by("query_id").agg(
            pl.col("label").sum().alias("positives")
        ).sort("query_id")
        assert positives["positives"].to_list() == [1, 1, 0, 1]
        assert result.filter(pl.col("query_id") == "toy:4")["has_label"].to_list() == [False, False]

    def test_session_features_use_only_past_events(self, engine, ranking_actions):
        result = engine.build_candidate_rows(ranking_actions, source="past")
        first = result.filter(pl.col("query_id") == "past:1").row(0, named=True)
        second = result.filter(pl.col("query_id") == "past:3").row(0, named=True)
        other_user = result.filter(pl.col("query_id") == "past:5").row(0, named=True)

        assert (first["session_length"], first["action_count"], first["click_count"]) == (1, 1, 0)
        assert first["last_action_type"] == "search for destination"
        assert (second["session_length"], second["action_count"], second["click_count"]) == (3, 3, 1)
        assert second["last_action_type"] == "interaction item image"
        assert (other_user["session_length"], other_user["click_count"]) == (0, 0)
        assert other_user["last_action_type"] is None

        future = ranking_actions.with_columns(
            pl.when(pl.col("step") == 5).then(pl.lit("B"))
            .otherwise(pl.col("reference")).alias("reference")
        )
        changed = engine.build_candidate_rows(future, source="past")
        for column in (
            "session_length", "action_count", "click_count",
            "last_action_type", "prior_item_interactions",
        ):
            assert first[column] == changed.filter(pl.col("query_id") == "past:1").row(0, named=True)[column]

        # Input file order is not a substitute for event time within a session.
        reordered = engine.build_candidate_rows(ranking_actions.reverse(), source="reverse")
        first_reordered = reordered.filter(
            (pl.col("user_id") == "u") & (pl.col("timestamp") == 110)
        ).row(0, named=True)
        assert (first_reordered["session_length"], first_reordered["click_count"]) == (1, 0)
        assert first_reordered["last_action_type"] == "search for destination"

    def test_malformed_lists_are_rejected_without_misaligning_prices(self, engine, ranking_actions):
        malformed = ranking_actions.with_columns(
            pl.when(pl.col("step") == 4).then(pl.lit("80"))
            .otherwise(pl.col("prices")).alias("prices")
        )
        malformed = malformed.with_columns(
            pl.when((pl.col("step") == 5) & (pl.col("user_id") == "u"))
            .then(pl.lit("A|A"))
            .otherwise(pl.col("impressions")).alias("impressions")
        )
        result = engine.build_candidate_rows(malformed, source="bad")
        assert "bad:3" not in result["query_id"].to_list()
        assert "bad:4" not in result["query_id"].to_list()
        assert result["query_id"].n_unique() == 2

    def test_timestamp_weekday_matches_calendar(self, engine):
        epoch = pl.DataFrame({"timestamp": [0, 2 * 86400, 3 * 86400]})
        result = engine.extract_temporal_features(epoch)
        assert result["day_of_week"].to_list() == [4, 6, 7]
        assert result["is_weekend"].to_list() == [False, True, True]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
