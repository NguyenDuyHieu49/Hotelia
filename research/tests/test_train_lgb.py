"""Tests for LightGBM Ranker."""

import pytest
from pathlib import Path
import numpy as np
import polars as pl

import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

from train_lgb import LGBConfig, LGBMRanker, RankingDataset


class TestRankingDataset:
    """Tests for RankingDataset."""

    def test_prepare(self):
        """Test data preparation."""
        df = pl.DataFrame({
            "session_id": ["s1", "s1", "s2", "s2"],
            "reference": ["item1", "item2", "item3", "item4"],
            "action_type": ["clickout item"] * 4,
            "label": [1, 0, 1, 0],
            "avg_price": [100.0, 150.0, 200.0, 120.0],
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
        assert y.shape[0] == 4
        assert sum(groups) == 4  # 2 sessions

    def test_feature_names(self):
        """Test feature names."""
        dataset = RankingDataset()
        names = dataset.get_feature_names()

        assert "avg_price" in names
        assert "city_id" in names
        assert "session_length" in names


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

        assert config.num_leaves == 63
        assert config.learning_rate == 0.05
        assert config.n_estimators == 100
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
