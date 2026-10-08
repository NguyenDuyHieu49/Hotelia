"""Tests for LightGBM Ranker."""

import pytest
from pathlib import Path
import numpy as np
import polars as pl

import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

from train_lgb import LGBConfig, LGBMRanker, RankingDataset, ranking_metrics


class TestRankingDataset:
    """Tests for RankingDataset."""

    def test_prepare(self):
        """Query groups remain contiguous even when input rows are interleaved."""
        df = pl.DataFrame({
            "query_id": ["q2", "q1", "q2", "q1"],
            "session_id": ["s2", "s1", "s2", "s1"],
            "item_id": ["item3", "item1", "item4", "item2"],
            "timestamp": [20, 10, 20, 10],
            "position": [0, 0, 1, 1],
            "label": [1, 0, 0, 1],
            "has_label": [True] * 4,
            "price": [200.0, 100.0, 120.0, 150.0],
            "price_rank": [1, 0, 0, 1],
            "price_relative": [1.1, 0.9, 0.9, 1.1],
            "prior_item_interactions": [0, 1, 0, 1],
            "star_rating": [5, 4, 3, 4],
            "amenity_count": [8, 4, 3, 5],
            "city_id": [1, 1, 2, 2],
            "device_type": [0, 0, 1, 1],
            "platform_encoded": [0, 0, 1, 1],
            "filter_count": [2, 2, 3, 3],
            "session_length": [4, 4, 4, 4],
            "action_count": [4, 4, 4, 4],
            "click_count": [2, 2, 2, 2],
            "last_action_type_encoded": [0, 0, 0, 0],
            "hour": [10, 10, 14, 14],
            "day_of_week": [1, 1, 2, 2],
            "is_weekend": [False, False, False, False],
        })

        dataset = RankingDataset()
        X, y, groups = dataset.prepare(df)

        assert X.shape[0] == 4
        assert groups.tolist() == [2, 2]
        assert y.tolist() == [0, 1, 1, 0]
        assert X[:, 0].tolist() == [0, 1, 0, 1]

    def test_feature_names(self):
        """Test feature names."""
        dataset = RankingDataset()
        names = dataset.get_feature_names()

        assert "price" in names
        assert "position" in names
        assert "city_id" in names
        assert "session_length" in names
        assert "is_clicked" not in names

    def test_rejects_invalid_group(self):
        df = pl.DataFrame({
            "query_id": ["q1", "q1"],
            "session_id": ["s1", "s1"],
            "item_id": ["a", "b"],
            "timestamp": [10, 10],
            "position": [0, 1],
            "label": [1, 1],
            **{name: [0, 0] for name in RankingDataset.FEATURE_COLUMNS if name != "position"},
        })
        with pytest.raises(ValueError, match="Invalid clickout"):
            RankingDataset().prepare(df)

    def test_temporal_split_keeps_sessions_together(self):
        df = pl.DataFrame({
            "query_id": ["q2", "q1", "q3", "q1", "q2", "q3"],
            "session_id": ["s1", "s1", "s2", "s1", "s1", "s2"],
            "item_id": ["c", "a", "e", "b", "d", "f"],
            "timestamp": [20, 10, 30, 10, 20, 30],
            "position": [0, 0, 0, 1, 1, 1],
            "label": [0, 1, 1, 0, 1, 0],
            **{name: [0] * 6 for name in RankingDataset.FEATURE_COLUMNS if name != "position"},
        })
        later = df.select(
            pl.lit("q4").alias("query_id"),
            pl.lit("s3").alias("session_id"),
            pl.lit("g").alias("item_id"),
            pl.lit(40).alias("timestamp"),
            pl.lit(0).alias("position"),
            pl.lit(1).alias("label"),
            *[pl.lit(0).alias(name) for name in RankingDataset.FEATURE_COLUMNS if name != "position"],
        ).head(1)
        later = pl.concat([later, later.with_columns(
            pl.lit("h").alias("item_id"), pl.lit(1).alias("position"), pl.lit(0).alias("label")
        )])
        train, validation = RankingDataset().temporal_split(
            pl.concat([df, later], how="vertical_relaxed"), 0.34
        )
        assert set(train["session_id"]) == {"s1"}
        assert set(validation["session_id"]) == {"s2", "s3"}
        assert train["timestamp"].max() < validation["timestamp"].min()


def test_ranking_metrics_respect_query_boundaries():
    scores = np.array([0.2, 0.9, 0.8, 0.1])
    labels = np.array([1, 0, 1, 0])
    metrics = ranking_metrics(scores, labels, np.array([2, 2]))
    assert metrics["mrr@5"] == 0.75
    assert metrics["hit@5"] == 1.0


class TestLGBMRanker:
    """Tests for LGBMRanker."""

    def test_fit_predict(self):
        """Test training and prediction."""
        # Create sample data
        np.random.seed(42)
        n_samples = 100
        n_features = 5

        X_train = np.random.randn(n_samples, n_features)
        y_train = np.random.randint(0, 2, n_samples)
        groups_train = np.array([20, 30, 25, 25])

        config = LGBConfig(n_estimators=10)
        model = LGBMRanker(config)
        model.fit(X_train, y_train, groups_train)

        # Predict
        X_test = np.random.randn(20, n_features)
        scores = model.predict(X_test)

        assert len(scores) == 20
        assert isinstance(scores, np.ndarray)


class TestLGBConfig:
    """Tests for LGBConfig."""

    def test_default_values(self):
        """Test default configuration."""
        config = LGBConfig()

        assert config.num_leaves == 31
        assert config.learning_rate == 0.05
        assert config.n_estimators == 500
        assert 5 in config.ndcg_eval_at
        assert 10 in config.ndcg_eval_at

    def test_custom_values(self):
        """Test custom configuration."""
        config = LGBConfig(
            num_leaves=31,
            learning_rate=0.1,
            n_estimators=50,
        )

        assert config.num_leaves == 31
        assert config.learning_rate == 0.1
        assert config.n_estimators == 50


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
