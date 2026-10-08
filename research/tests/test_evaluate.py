"""Tests for Evaluation Metrics."""

import pytest
import numpy as np
import polars as pl
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

    def test_ideal_uses_all_candidates(self):
        # Omitting the clicked item must not make the incomplete ranking perfect.
        assert ndcg_at_k(["a"], {"a": 0, "b": 1}, k=1) == 0.0


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

    @staticmethod
    def _ground_truth():
        # Two clickouts may occur within the same session.
        return pl.DataFrame({
            "query_id": ["q1", "q1", "q2", "q2"],
            "session_id": ["s1"] * 4,
            "item_id": ["a", "b", "a", "b"],
            "position": [0, 1, 0, 1],
            "label": [0, 1, 1, 0],
        })

    @staticmethod
    def _predictions():
        # Input row order is deliberately different from display order.
        return pl.DataFrame({
            "query_id": ["q2", "q1", "q2", "q1"],
            "item_id": ["b", "b", "a", "a"],
            "score": [0.1, 0.0, 0.9, 0.0],
        })

    def test_evaluates_each_clickout_and_breaks_ties_by_position(self):
        evaluator = Evaluator(k_values=[1, 2])
        result = evaluator.evaluate_baseline("model", self._predictions(), self._ground_truth())
        assert result["queries"] == 2
        assert result["mrr@2"] == pytest.approx(0.75)
        assert result["hit@1"] == pytest.approx(0.5)
        assert result["ndcg@2"] == pytest.approx((1 + 1 / np.log2(3)) / 2)

    def test_rejects_incomplete_or_extra_candidates(self):
        evaluator = Evaluator(k_values=[2])
        predictions = self._predictions()
        with pytest.raises(ValueError, match="1 missing"):
            evaluator.evaluate_baseline("incomplete", predictions.slice(1, 3), self._ground_truth())
        extra = pl.concat([predictions, pl.DataFrame({
            "query_id": ["q9"], "item_id": ["z"], "score": [1.0],
        })])
        with pytest.raises(ValueError, match="1 extra"):
            evaluator.evaluate_baseline("extra", extra, self._ground_truth())

    def test_rejects_duplicate_or_nonfinite_predictions(self):
        evaluator = Evaluator(k_values=[2])
        predictions = self._predictions()
        with pytest.raises(ValueError, match="Duplicate prediction"):
            evaluator.evaluate_baseline("duplicate", pl.concat([predictions, predictions.head(1)]), self._ground_truth())
        bad_score = predictions.with_columns(
            pl.when(pl.col("query_id") == "q1").then(float("nan")).otherwise(pl.col("score")).alias("score")
        )
        with pytest.raises(ValueError, match="finite score"):
            evaluator.evaluate_baseline("nonfinite", bad_score, self._ground_truth())

    def test_rejects_unlabeled_query_instead_of_inflating_average(self):
        truth = self._ground_truth().with_columns(
            pl.when(pl.col("query_id") == "q2").then(0).otherwise(pl.col("label")).alias("label")
        )
        with pytest.raises(ValueError, match="one clicked candidate"):
            Evaluator().evaluate_baseline("bad", self._predictions(), truth)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
