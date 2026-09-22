"""
Evaluation Metrics for Hotel Recommendation
Computes NDCG, MRR, Hit@K for model comparison.
"""

import logging
import json
from pathlib import Path
from dataclasses import dataclass
from typing import Dict, List, Tuple

import numpy as np
import polars as pl

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def dcg_at_k(relevance: np.ndarray, k: int) -> float:
    """
    Compute DCG@k.

    DCG@k = sum_{i=1}^{k} rel_i / log2(i+1)
    """
    relevance = np.asarray(relevance)[:k]
    if len(relevance) == 0:
        return 0.0

    gains = relevance
    discounts = np.log2(np.arange(2, len(relevance) + 2))

    return np.sum(gains / discounts)


def ndcg_at_k(predicted_ranking: List[str],
              true_relevance: Dict[str, float],
              k: int = 10) -> float:
    """
    Compute NDCG@k.

    Args:
        predicted_ranking: List of item IDs in predicted order
        true_relevance: Dict mapping item_id -> relevance score (0 or 1)
        k: Cutoff position

    Returns:
        NDCG@k score (0 to 1)
    """
    # Get relevance scores for predicted order
    relevances = np.array([true_relevance.get(item, 0.0) for item in predicted_ranking])

    # Compute DCG
    dcg = dcg_at_k(relevances, k)

    # Compute ideal DCG (best possible ranking)
    ideal_relevances = np.sort(relevances)[::-1][:k]
    idcg = dcg_at_k(ideal_relevances, k)

    # Handle edge case
    if idcg == 0:
        return 0.0

    return dcg / idcg


def mrr_at_k(predicted_ranking: List[str],
              relevant_items: set,
              k: int = 10) -> float:
    """
    Compute MRR@k (Mean Reciprocal Rank).

    MRR@k = 1 / rank_of_first_relevant_item

    Returns 0 if no relevant item in top k.
    """
    for i, item in enumerate(predicted_ranking[:k], 1):
        if item in relevant_items:
            return 1.0 / i

    return 0.0


def hit_rate_at_k(predicted_ranking: List[str],
                  relevant_items: set,
                  k: int = 10) -> float:
    """
    Compute Hit Rate@k.

    Returns 1.0 if at least one relevant item is in top k, else 0.0.
    """
    for item in predicted_ranking[:k]:
        if item in relevant_items:
            return 1.0
    return 0.0


def precision_at_k(predicted_ranking: List[str],
                  relevant_items: set,
                  k: int = 10) -> float:
    """
    Compute Precision@k.

    Returns fraction of top-k items that are relevant.
    """
    if k == 0:
        return 0.0

    hits = sum(1 for item in predicted_ranking[:k] if item in relevant_items)
    return hits / k


class Evaluator:
    """
    Evaluator for ranking models.
    """

    def __init__(self, k_values: List[int] = None):
        self.k_values = k_values or [5, 10]
        self.results: Dict[str, Dict] = {}

    def evaluate_baseline(self,
                         name: str,
                         predictions: pl.DataFrame,
                         ground_truth: pl.DataFrame) -> Dict:
        """
        Evaluate a baseline model.

        Args:
            name: Model name (B0, B1, etc.)
            predictions: DataFrame with session_id, item_id/reference, score
            ground_truth: DataFrame with session_id, item_id, label

        Returns:
            Dict with metrics per k
        """
        logger.info(f"Evaluating {name}...")

        results = {f"ndcg@{k}": [] for k in self.k_values}
        results.update({f"mrr@{k}": [] for k in self.k_values})
        results.update({f"hit@{k}": [] for k in self.k_values})

        # Build ground truth dict
        gt_dict = {}
        for row in ground_truth.iter_rows(named=True):
            session_id = row["session_id"]
            if session_id not in gt_dict:
                gt_dict[session_id] = {}
            gt_dict[session_id][row["item_id"]] = row["label"]

        # Handle column name (item_id vs reference)
        item_col = "item_id" if "item_id" in predictions.columns else "reference"

        # Compute metrics per session
        for session_id in predictions["session_id"].unique():
            session_pred = predictions.filter(
                pl.col("session_id") == session_id
            ).sort("score", descending=True)

            predicted_items = session_pred[item_col].to_list()

            if session_id not in gt_dict:
                continue

            true_labels = gt_dict[session_id]
            relevant_items = {item for item, label in true_labels.items() if label > 0}
            # Use item_id or reference
            predicted_items = [item for item in predicted_items if item in true_labels or item in relevant_items]

            if not relevant_items:
                continue

            # Compute metrics
            for k in self.k_values:
                ndcg = ndcg_at_k(predicted_items, true_labels, k)
                mrr = mrr_at_k(predicted_items, relevant_items, k)
                hit = hit_rate_at_k(predicted_items, relevant_items, k)

                results[f"ndcg@{k}"].append(ndcg)
                results[f"mrr@{k}"].append(mrr)
                results[f"hit@{k}"].append(hit)

        # Average metrics
        avg_results = {}
        for metric, values in results.items():
            if values:
                avg_results[metric] = float(np.mean(values))
            else:
                avg_results[metric] = 0.0

        self.results[name] = avg_results

        return avg_results

    def print_results(self):
        """Print evaluation results."""
        logger.info("\n" + "=" * 60)
        logger.info("EVALUATION RESULTS")
        logger.info("=" * 60)

        # Header
        header = f"{'Model':<10}"
        for metric in ["NDCG@5", "NDCG@10", "MRR@10", "Hit@5", "Hit@10"]:
            header += f"{metric:>12}"
        logger.info(header)
        logger.info("-" * 70)

        # Results per model
        for name, metrics in self.results.items():
            row = f"{name:<10}"
            row += f"{metrics.get('ndcg@5', 0):>12.4f}"
            row += f"{metrics.get('ndcg@10', 0):>12.4f}"
            row += f"{metrics.get('mrr@10', 0):>12.4f}"
            row += f"{metrics.get('hit@5', 0):>12.4f}"
            row += f"{metrics.get('hit@10', 0):>12.4f}"
            logger.info(row)

        logger.info("=" * 60)

    def save_results(self, output_path: Path):
        """Save results to JSON."""
        with open(output_path, 'w') as f:
            json.dump(self.results, f, indent=2)
        logger.info(f"Results saved to {output_path}")


def main():
    """Main entry point."""
    import argparse

    parser = argparse.ArgumentParser(description="Evaluate ranking models")
    parser.add_argument("--predictions-dir", default="data/baselines",
                        help="Directory with prediction files")
    parser.add_argument("--output-dir", default="data/evaluation",
                        help="Output directory")
    parser.add_argument("--k", nargs="+", type=int, default=[5, 10],
                        help="K values for evaluation")
    args = parser.parse_args()

    base_dir = Path(__file__).parent.parent
    output_dir = base_dir / args.output_dir
    output_dir.mkdir(parents=True, exist_ok=True)

    logger.info("=" * 60)
    logger.info("MODEL EVALUATION")
    logger.info("=" * 60)

    # Initialize evaluator
    evaluator = Evaluator(k_values=args.k)

    # Load ground truth (test set with labels)
    # For now, use test features which have labels
    test_path = base_dir / "data/features/test_features.parquet"
    if test_path.exists():
        test_df = pl.read_parquet(test_path)

        # Create ground truth
        ground_truth = test_df.select(["session_id", "reference", "label"]).rename({
            "reference": "item_id"
        })

        # Evaluate baselines
        for name in ["B0", "B1", "B2"]:
            pred_path = base_dir / args.predictions_dir / f"baseline_{name}.parquet"
            if pred_path.exists():
                predictions = pl.read_parquet(pred_path)
                evaluator.evaluate_baseline(name, predictions, ground_truth)

        evaluator.print_results()
        evaluator.save_results(output_dir / "results.json")

    logger.info("\n" + "=" * 60)
    logger.info("EVALUATION COMPLETE")
    logger.info("=" * 60)


if __name__ == "__main__":
    main()
