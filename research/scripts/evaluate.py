"""Offline clickout ranking evaluation, one candidate set per query_id."""

import argparse
import json
import logging
import math
from collections import defaultdict
from pathlib import Path
from typing import Dict, List

import numpy as np
import polars as pl

logger = logging.getLogger(__name__)


def dcg_at_k(relevance: np.ndarray, k: int) -> float:
    """Discounted cumulative gain with the standard 2**relevance - 1 gain."""
    if k <= 0:
        return 0.0
    values = np.asarray(relevance, dtype=np.float64)[:k]
    if not len(values):
        return 0.0
    gains = np.power(2.0, values) - 1.0
    discounts = np.log2(np.arange(2, len(values) + 2))
    return float(np.sum(gains / discounts))


def ndcg_at_k(predicted_ranking: List[str], true_relevance: Dict[str, float], k: int = 10) -> float:
    """Normalize by the ideal ranking over the complete candidate set."""
    if k <= 0 or not true_relevance:
        return 0.0
    actual = [true_relevance.get(item, 0.0) for item in predicted_ranking]
    ideal = sorted(true_relevance.values(), reverse=True)
    denominator = dcg_at_k(ideal, k)
    return dcg_at_k(actual, k) / denominator if denominator else 0.0


def mrr_at_k(predicted_ranking: List[str], relevant_items: set, k: int = 10) -> float:
    for rank, item in enumerate(predicted_ranking[:k], start=1):
        if item in relevant_items:
            return 1.0 / rank
    return 0.0


def hit_rate_at_k(predicted_ranking: List[str], relevant_items: set, k: int = 10) -> float:
    return float(any(item in relevant_items for item in predicted_ranking[:k]))


def precision_at_k(predicted_ranking: List[str], relevant_items: set, k: int = 10) -> float:
    if k <= 0:
        return 0.0
    return sum(item in relevant_items for item in predicted_ranking[:k]) / k


def _item_column(df: pl.DataFrame) -> str:
    if "item_id" in df.columns:
        return "item_id"
    if "reference" in df.columns:
        return "reference"
    raise ValueError("Expected candidate item_id (or reference) column")


def _validate_unique_keys(rows: dict, query: str, item: str, kind: str) -> None:
    key = (query, item)
    if key in rows:
        raise ValueError(f"Duplicate {kind} row for query_id={query}, item_id={item}")


class Evaluator:
    """Compare complete rankings of held-out clickout candidate sets.

    A ground-truth row identifies a candidate by (query_id, item_id), with its
    logged position and click label. Predictions must cover exactly those keys;
    dropping or adding candidates would otherwise make metrics incomparable.
    """

    def __init__(self, k_values: List[int] = None):
        self.k_values = sorted(set(k_values if k_values is not None else [5, 10]))
        if not self.k_values or any(k <= 0 for k in self.k_values):
            raise ValueError("k_values must contain positive integers")
        self.results: Dict[str, Dict] = {}

    def evaluate_baseline(
        self,
        name: str,
        predictions: pl.DataFrame,
        ground_truth: pl.DataFrame,
    ) -> Dict:
        required_gt = {"query_id", "label", "position"}
        required_pred = {"query_id", "score"}
        if required_gt - set(ground_truth.columns):
            raise ValueError(f"Ground truth missing: {sorted(required_gt - set(ground_truth.columns))}")
        if required_pred - set(predictions.columns):
            raise ValueError(f"Predictions missing: {sorted(required_pred - set(predictions.columns))}")
        gt_item = _item_column(ground_truth)
        pred_item = _item_column(predictions)

        labels: dict[str, dict[str, float]] = defaultdict(dict)
        positions: dict[str, dict[str, int]] = defaultdict(dict)
        truth_keys: set[tuple[str, str]] = set()
        for row in ground_truth.select(["query_id", gt_item, "label", "position"]).iter_rows():
            query, item, label, position = row
            if query is None or item is None or position is None:
                raise ValueError("Ground truth query_id, item_id and position must be non-null")
            query, item = str(query), str(item)
            _validate_unique_keys(truth_keys, query, item, "ground-truth")
            if label not in (0, 1):
                raise ValueError("Clickout ground-truth labels must be 0 or 1")
            if position < 0 or position in positions[query].values():
                raise ValueError(f"Positions must be unique, nonnegative within query_id={query}")
            truth_keys.add((query, item))
            labels[query][item] = float(label)
            positions[query][item] = int(position)

        if not truth_keys:
            raise ValueError("No candidate rows to evaluate")
        for query, item_labels in labels.items():
            if sum(item_labels.values()) != 1:
                raise ValueError(f"Expected one clicked candidate in query_id={query}")

        scores: dict[tuple[str, str], float] = {}
        for query, item, score in predictions.select(["query_id", pred_item, "score"]).iter_rows():
            if query is None or item is None or score is None or not math.isfinite(float(score)):
                raise ValueError("Predicted query_id, item_id and finite score are required")
            query, item = str(query), str(item)
            _validate_unique_keys(scores, query, item, "prediction")
            scores[(query, item)] = float(score)

        predicted_keys = set(scores)
        if predicted_keys != truth_keys:
            missing = truth_keys - predicted_keys
            extra = predicted_keys - truth_keys
            raise ValueError(
                f"Predictions must cover each evaluated candidate exactly once: "
                f"{len(missing)} missing, {len(extra)} extra"
            )

        metric_values = {
            metric: []
            for k in self.k_values
            for metric in (f"ndcg@{k}", f"mrr@{k}", f"hit@{k}")
        }
        for query in sorted(labels):
            # Original display position makes equal-score ordering reproducible.
            ranking = sorted(
                labels[query],
                key=lambda item: (-scores[(query, item)], positions[query][item], item),
            )
            relevant = {item for item, label in labels[query].items() if label > 0}
            for k in self.k_values:
                metric_values[f"ndcg@{k}"].append(ndcg_at_k(ranking, labels[query], k))
                metric_values[f"mrr@{k}"].append(mrr_at_k(ranking, relevant, k))
                metric_values[f"hit@{k}"].append(hit_rate_at_k(ranking, relevant, k))

        result = {metric: float(np.mean(values)) for metric, values in metric_values.items()}
        result["queries"] = len(labels)
        self.results[name] = result
        return result

    def print_results(self) -> None:
        columns = [f"{metric}@{k}" for k in self.k_values for metric in ("ndcg", "mrr", "hit")]
        logger.info("Model\tQueries\t%s", "\t".join(columns))
        for name, metrics in self.results.items():
            logger.info("%s\t%d\t%s", name, metrics["queries"],
                        "\t".join(f"{metrics[column]:.4f}" for column in columns))

    def save_results(self, output_path: Path) -> None:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with output_path.open("w") as output:
            json.dump(self.results, output, indent=2)
        logger.info("Saved %s", output_path)


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate held-out clickout rankings")
    parser.add_argument("--features-dir", default="data/features")
    parser.add_argument("--predictions-dir", default="data/baselines")
    parser.add_argument("--output-dir", default="data/evaluation")
    parser.add_argument("--k", nargs="+", type=int, default=[5, 10])
    args = parser.parse_args()

    base_dir = Path(__file__).parent.parent
    feature_path = base_dir / args.features_dir / "test_features.parquet"
    if not feature_path.exists():
        raise FileNotFoundError(f"Held-out features missing: {feature_path}")
    test = pl.read_parquet(feature_path)
    if "has_label" in test.columns:
        test = test.filter(pl.col("has_label").fill_null(False))
    ground_truth = test.select(["query_id", "item_id", "label", "position"])

    evaluator = Evaluator(args.k)
    prediction_dir = base_dir / args.predictions_dir
    files = sorted(prediction_dir.glob("baseline_*.parquet"))
    # B4 is a legacy session-level algorithm and does not rank clickout candidates.
    files = [path for path in files if path.stem != "baseline_B4"]
    if not files:
        raise FileNotFoundError(f"No candidate-level predictions in {prediction_dir}; run baselines.py")
    for path in files:
        try:
            evaluator.evaluate_baseline(path.stem.removeprefix("baseline_"), pl.read_parquet(path), ground_truth)
        except ValueError as exc:
            raise ValueError(f"{path.name}: {exc}. Rebuild candidate features and predictions.") from exc
    evaluator.print_results()
    evaluator.save_results(base_dir / args.output_dir / "results.json")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    main()
