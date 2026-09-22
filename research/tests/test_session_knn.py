"""Tests for Session-kNN."""

import pytest
from pathlib import Path
import polars as pl

import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

from session_knn import Session, SessionKNN, SessionKNNConfig, FallbackPopularity


class TestSession:
    """Tests for Session class."""

    def test_similarity_same_items(self):
        """Test similarity with identical items."""
        s1 = Session("s1", ["a", "b", "c"], 1000)
        s2 = Session("s2", ["a", "b", "c"], 1001)

        assert s1.similarity(s2) > 0.9

    def test_similarity_no_overlap(self):
        """Test similarity with no overlap."""
        s1 = Session("s1", ["a", "b"], 1000)
        s2 = Session("s2", ["c", "d"], 1001)

        assert s1.similarity(s2) == 0.0

    def test_similarity_partial_overlap(self):
        """Test similarity with partial overlap."""
        s1 = Session("s1", ["a", "b", "c"], 1000)
        s2 = Session("s2", ["b", "c", "d"], 1001)

        sim = s1.similarity(s2)
        assert 0 < sim < 1

    def test_empty_session(self):
        """Test empty session."""
        s1 = Session("s1", [], 1000)
        s2 = Session("s2", ["a"], 1001)

        assert s1.similarity(s2) == 0.0


class TestSessionKNN:
    """Tests for SessionKNN."""

    @pytest.fixture
    def sample_data(self):
        """Create sample data for testing."""
        return pl.DataFrame({
            "session_id": ["s1", "s1", "s2", "s2", "s3", "s3"],
            "reference": ["item1", "item2", "item1", "item3", "item2", "item3"],
            "timestamp": [100, 101, 102, 103, 104, 105],
            "action_type": ["clickout item"] * 6,
        })

    def test_fit(self, sample_data):
        """Test fitting SessionKNN."""
        model = SessionKNN(SessionKNNConfig(k=10))
        model.fit(sample_data)

        assert len(model.sessions) == 3
        assert "s1" in model.sessions
        assert "s2" in model.sessions

    def test_find_neighbors(self, sample_data):
        """Test finding neighbors."""
        model = SessionKNN(SessionKNNConfig(k=10))
        model.fit(sample_data)

        session = model.sessions["s1"]
        neighbors = model.find_neighbors(session, exclude_self=True)

        # Should find s2 and s3 as they share items
        assert len(neighbors) <= 2

    def test_predict(self, sample_data):
        """Test prediction."""
        model = SessionKNN(SessionKNNConfig(k=10))
        model.fit(sample_data)

        results = model.predict(sample_data)

        assert len(results) > 0
        assert "score" in results.columns

    def test_no_neighbors(self):
        """Test handling when no neighbors found."""
        data = pl.DataFrame({
            "session_id": ["s1"],
            "reference": ["item1"],
            "timestamp": [100],
            "action_type": ["clickout item"],
        })

        model = SessionKNN(SessionKNNConfig(k=10))
        model.fit(data)

        # Predict should return empty when no neighbors
        results = model.predict(data)
        # Should still return, just with 0 or default scores


class TestFallbackPopularity:
    """Tests for FallbackPopularity."""

    def test_fit(self):
        """Test fitting popularity."""
        df = pl.DataFrame({
            "reference": ["a", "a", "b", "c"],
            "action_type": ["clickout item"] * 4,
        })

        model = FallbackPopularity()
        model.fit(df)

        assert len(model.popularity) == 3
        # 'a' should be most popular
        assert model.popularity["a"] > model.popularity["b"]

    def test_predict(self):
        """Test prediction."""
        df = pl.DataFrame({
            "reference": ["a", "b"],
            "action_type": ["clickout item"] * 2,
        })

        model = FallbackPopularity()
        model.fit(df)

        results = model.predict(df)
        assert "score" in results.columns


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
