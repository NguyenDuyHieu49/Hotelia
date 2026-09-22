"""Tests for Evaluation Metrics."""

import pytest
import numpy as np
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

from evaluate import (
    dcg_at_k, ndcg_at_k, mrr_at_k, hit_rate_at_k, precision_at_k, Evaluator
)


class TestDCG:
    """Tests for DCG."""

    def test_dcg_empty(self):
        """Test DCG with empty input."""
        assert dcg_at_k([], 5) == 0.0

    def test_dcg_perfect(self):
        """Test DCG with perfect relevance."""
        relevance = [1, 1, 1, 1]
        dcg = dcg_at_k(relevance, 4)
        assert dcg > 0

    def test_dcg_partial(self):
        """Test DCG with partial relevance."""
        relevance = [1, 0, 0, 1]
        dcg = dcg_at_k(relevance, 4)
        assert dcg > 0


class TestNDCG:
    """Tests for NDCG."""

    def test_ndcg_perfect_ranking(self):
        """Test NDCG with perfect ranking."""
        ranking = ["a", "b", "c"]
        relevance = {"a": 1, "b": 1, "c": 0}

        ndcg = ndcg_at_k(ranking, relevance, k=3)
        assert ndcg == 1.0

    def test_ndcg_worst_ranking(self):
        """Test NDCG with worst ranking."""
        ranking = ["c", "b", "a"]  # Relevant item last
        relevance = {"a": 1, "b": 1, "c": 0}

        ndcg = ndcg_at_k(ranking, relevance, k=3)
        assert ndcg < 1.0

    def test_ndcg_empty(self):
        """Test NDCG with empty relevance."""
        ranking = ["a", "b"]
        relevance = {}

        ndcg = ndcg_at_k(ranking, relevance, k=3)
        assert ndcg == 0.0


class TestMRR:
    """Tests for MRR."""

    def test_mrr_first_relevant(self):
        """Test MRR when first item is relevant."""
        ranking = ["a", "b", "c"]
        relevant = {"a"}

        mrr = mrr_at_k(ranking, relevant, k=3)
        assert mrr == 1.0

    def test_mrr_second_relevant(self):
        """Test MRR when second item is relevant."""
        ranking = ["b", "a", "c"]
        relevant = {"a"}

        mrr = mrr_at_k(ranking, relevant, k=3)
        assert mrr == 0.5

    def test_mrr_none_relevant(self):
        """Test MRR when no relevant items."""
        ranking = ["a", "b", "c"]
        relevant = {"x"}

        mrr = mrr_at_k(ranking, relevant, k=3)
        assert mrr == 0.0


class TestHitRate:
    """Tests for Hit Rate."""

    def test_hit_rate_hit(self):
        """Test Hit Rate when there's a hit."""
        ranking = ["a", "b", "c"]
        relevant = {"b"}

        hit = hit_rate_at_k(ranking, relevant, k=3)
        assert hit == 1.0

    def test_hit_rate_miss(self):
        """Test Hit Rate when there's no hit."""
        ranking = ["a", "b", "c"]
        relevant = {"x", "y"}

        hit = hit_rate_at_k(ranking, relevant, k=3)
        assert hit == 0.0


class TestPrecision:
    """Tests for Precision."""

    def test_precision_half(self):
        """Test Precision when half are relevant."""
        ranking = ["a", "b", "c", "d"]
        relevant = {"a", "b"}

        precision = precision_at_k(ranking, relevant, k=4)
        assert precision == 0.5

    def test_precision_zero(self):
        """Test Precision when none are relevant."""
        ranking = ["a", "b"]
        relevant = {"x"}

        precision = precision_at_k(ranking, relevant, k=2)
        assert precision == 0.0


class TestEvaluator:
    """Tests for Evaluator class."""

    def test_evaluator_init(self):
        """Test Evaluator initialization."""
        evaluator = Evaluator(k_values=[5, 10])

        assert 5 in evaluator.k_values
        assert 10 in evaluator.k_values

    def test_evaluator_default_k(self):
        """Test Evaluator with default k values."""
        evaluator = Evaluator()

        assert 5 in evaluator.k_values
        assert 10 in evaluator.k_values


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
