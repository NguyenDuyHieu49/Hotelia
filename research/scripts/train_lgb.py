"""Train and validate a LightGBM ranker on clickout candidate rows."""

import argparse
import json
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import lightgbm as lgb
import numpy as np
import polars as pl

logger = logging.getLogger(__name__)


@dataclass
class LGBConfig:
    num_leaves: int = 31
    learning_rate: float = 0.05
    feature_fraction: float = 0.9
    bagging_fraction: float = 0.9
    bagging_freq: int = 1
    min_child_samples: int = 30
    n_estimators: int = 500
    ndcg_eval_at: list[int] = field(default_factory=lambda: [5, 10])


@dataclass
class TrainConfig:
    data_dir: Path
    output_dir: Path
    model_name: str = "B6-candidates"
    val_split: float = 0.15
    seed: int = 42


class RankingDataset:
    """Validate, order and split candidate rows by clickout query."""

    # Never feed IDs, labels, clicked item or post-click events into the model.
    FEATURE_COLUMNS = [
        "position", "price", "price_rank", "price_relative",
        "prior_item_interactions", "star_rating", "amenity_count",
        "city_id", "device_type", "platform_encoded", "filter_count",
        "session_length", "action_count", "click_count", "last_action_type_encoded",
        "hour", "day_of_week", "is_weekend",
    ]
    REQUIRED_COLUMNS = {"query_id", "session_id", "timestamp", "item_id", "label"}

    def __init__(self):
        self.feature_columns = list(self.FEATURE_COLUMNS)

    def get_feature_names(self) -> list[str]:
        return list(self.feature_columns)

    def ordered(self, df: pl.DataFrame) -> pl.DataFrame:
        missing = (self.REQUIRED_COLUMNS | set(self.feature_columns)) - set(df.columns)
        if missing:
            raise ValueError(f"Candidate rows are missing columns: {sorted(missing)}")
        if "has_label" in df.columns and not df["has_label"].all():
            raise ValueError("Unlabeled queries cannot be used for training")
        if df.is_empty():
            raise ValueError("No candidate rows available")
        ordered = df.sort(["query_id", "position", "item_id"])
        stats = ordered.group_by("query_id").agg(
            pl.len().alias("candidates"),
            pl.col("label").sum().alias("positives"),
            pl.col("item_id").n_unique().alias("unique_items"),
            pl.col("session_id").n_unique().alias("sessions"),
        )
        invalid = stats.filter(
            (pl.col("candidates") < 2)
            | (pl.col("positives") != 1)
            | (pl.col("unique_items") != pl.col("candidates"))
            | (pl.col("sessions") != 1)
        )
        if not invalid.is_empty():
            raise ValueError(f"Invalid clickout candidate groups: {invalid.height} queries")
        return ordered

    def prepare(self, df: pl.DataFrame, is_train: bool = True) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
        ordered = self.ordered(df)
        feature_df = ordered.select(
            pl.col(name).cast(pl.Float32, strict=False).fill_null(-1.0)
            for name in self.feature_columns
        )
        features = np.nan_to_num(
            feature_df.to_numpy().astype(np.float32), nan=-1.0, posinf=-1.0, neginf=-1.0
        )
        labels = ordered["label"].cast(pl.Int8).to_numpy()
        groups = ordered.group_by("query_id", maintain_order=True).len()["len"].to_numpy()
        if int(groups.sum()) != len(labels):
            raise ValueError("LightGBM groups do not align with candidate rows")
        return features, labels, groups

    def temporal_split(self, df: pl.DataFrame, fraction: float) -> tuple[pl.DataFrame, pl.DataFrame]:
        """Hold out newest sessions; no session can cross the validation boundary."""
        if not 0 < fraction < 1:
            raise ValueError("val_split must be between zero and one")
        ordered = self.ordered(df)
        sessions = (
            ordered.group_by("session_id")
            .agg(pl.col("timestamp").min().alias("first_seen"))
            .sort(["first_seen", "session_id"])
        )
        if sessions.height < 3:
            raise ValueError("At least three sessions are needed for validation")
        split_at = min(max(int(sessions.height * (1 - fraction)), 1), sessions.height - 1)
        train_ids = sessions["session_id"][:split_at]
        val_ids = sessions["session_id"][split_at:]
        train = ordered.filter(pl.col("session_id").is_in(train_ids.to_list()))
        val = ordered.filter(pl.col("session_id").is_in(val_ids.to_list()))
        if set(train["query_id"].unique().to_list()) & set(val["query_id"].unique().to_list()):
            raise ValueError("A ranking query crossed the validation boundary")
        return train, val


def ranking_metrics(scores: np.ndarray, labels: np.ndarray, groups: np.ndarray) -> dict[str, float]:
    """Evaluate each query once, breaking equal scores by displayed position."""
    names = [f"{metric}@{cutoff}" for cutoff in (5, 10) for metric in ("mrr", "hit", "ndcg")]
    values: dict[str, list[float]] = {name: [] for name in names}
    start = 0
    for size in groups:
        end = start + int(size)
        ranking = np.lexsort((np.arange(size), -scores[start:end]))
        relevant = labels[start:end][ranking]
        ranks = np.flatnonzero(relevant > 0)
        if len(ranks) != 1:
            raise ValueError("Each evaluation query needs exactly one clicked hotel")
        rank = int(ranks[0]) + 1
        for cutoff in (5, 10):
            values[f"mrr@{cutoff}"].append(1.0 / rank if rank <= cutoff else 0.0)
            values[f"hit@{cutoff}"].append(float(rank <= cutoff))
            values[f"ndcg@{cutoff}"].append(1.0 / np.log2(rank + 1) if rank <= cutoff else 0.0)
        start = end
    if start != len(labels):
        raise ValueError("Evaluation groups do not cover all candidate rows")
    return {name: float(np.mean(result)) for name, result in values.items()}


class LGBMRanker:
    def __init__(self, config: LGBConfig):
        self.config = config
        self.model: Optional[lgb.LGBMRanker] = None
        self.feature_names: list[str] = []
        self.validation_report: dict = {}

    def fit(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        groups_train: np.ndarray,
        validation: Optional[tuple[np.ndarray, np.ndarray, np.ndarray]] = None,
    ) -> "LGBMRanker":
        if sum(groups_train) != len(y_train):
            raise ValueError("Training groups do not match training rows")
        self.model = lgb.LGBMRanker(
            objective="lambdarank",
            metric="ndcg",
            num_leaves=self.config.num_leaves,
            learning_rate=self.config.learning_rate,
            colsample_bytree=self.config.feature_fraction,
            subsample=self.config.bagging_fraction,
            subsample_freq=self.config.bagging_freq,
            min_child_samples=self.config.min_child_samples,
            n_estimators=self.config.n_estimators,
            random_state=42,
            verbosity=-1,
        )
        kwargs = {}
        if validation is not None:
            X_val, y_val, groups_val = validation
            if sum(groups_val) != len(y_val):
                raise ValueError("Validation groups do not match validation rows")
            kwargs = {
                "eval_X": (X_val,),
                "eval_y": (y_val,),
                "eval_group": [groups_val],
                "eval_at": self.config.ndcg_eval_at,
                "callbacks": [lgb.early_stopping(30, verbose=False)],
            }
        self.model.fit(X_train, y_train, group=groups_train, **kwargs)
        return self

    def predict(self, X: np.ndarray) -> np.ndarray:
        if self.model is None:
            raise ValueError("Model has not been trained")
        return self.model.predict(X)

    def save(self, path: Path) -> None:
        if self.model is None:
            raise ValueError("Model has not been trained")
        self.model.booster_.save_model(str(path))

    def load(self, path: Path) -> None:
        booster = lgb.Booster(model_file=str(path))
        self.model = lgb.LGBMRanker()
        self.model._Booster = booster


def eligible_labeled_queries(candidates: pl.DataFrame) -> tuple[pl.DataFrame, int, int]:
    """Exclude missing targets and degenerate lists, returning exclusion counts."""
    source_queries = candidates["query_id"].n_unique()
    if "has_label" in candidates.columns:
        candidates = candidates.filter(pl.col("has_label"))
    eligible = candidates.group_by("query_id").agg(
        pl.len().alias("candidates"),
        pl.col("label").sum().alias("positives"),
        pl.col("item_id").n_unique().alias("unique_items"),
    ).filter(
        (pl.col("candidates") >= 2)
        & (pl.col("positives") == 1)
        & (pl.col("candidates") == pl.col("unique_items"))
    )
    candidates = candidates.join(eligible.select("query_id"), on="query_id", how="inner")
    if candidates.is_empty():
        raise ValueError("No complete, labeled clickout groups remain")
    return candidates, int(source_queries), int(source_queries - eligible.height)


def train_model(train_config: TrainConfig, lgb_config: LGBConfig) -> LGBMRanker:
    candidates, source_queries, excluded_queries = eligible_labeled_queries(
        pl.read_parquet(train_config.data_dir / "train_features.parquet")
    )
    dataset = RankingDataset()
    train, validation = dataset.temporal_split(candidates, train_config.val_split)
    X_train, y_train, groups_train = dataset.prepare(train)
    X_val, y_val, groups_val = dataset.prepare(validation)
    ranker = LGBMRanker(lgb_config).fit(
        X_train, y_train, groups_train, validation=(X_val, y_val, groups_val)
    )
    ranker.feature_names = dataset.get_feature_names()
    if not np.any(ranker.model.feature_importances_):
        raise ValueError("Training produced a constant model; no artifact was saved")

    model_metrics = ranking_metrics(ranker.predict(X_val), y_val, groups_val)
    position_index = ranker.feature_names.index("position")
    baseline_metrics = ranking_metrics(-X_val[:, position_index], y_val, groups_val)
    report = {
        "model": train_config.model_name,
        "train_queries": int(len(groups_train)),
        "validation_queries": int(len(groups_val)),
        "train_candidates": int(len(y_train)),
        "validation_candidates": int(len(y_val)),
        "source_queries": source_queries,
        "excluded_queries": excluded_queries,
        "validation_first_timestamp": int(validation["timestamp"].min()),
        "features": ranker.feature_names,
        "best_iteration": int(ranker.model.best_iteration_ or ranker.model.n_estimators_),
        "learned_splits": int(np.sum(ranker.model.feature_importances_)),
        "position_baseline": baseline_metrics,
        "lightgbm": model_metrics,
        "eligible_for_serving": False,
        "serving_note": "Requires Hotelia feature parity and live catalog validation",
    }
    holdout_path = train_config.data_dir / "test_features.parquet"
    if holdout_path.exists():
        test, test_source_queries, test_excluded_queries = eligible_labeled_queries(
            pl.read_parquet(holdout_path)
        )
        X_test, y_test, groups_test = dataset.prepare(test)
        report["later_holdout"] = {
            "queries": int(len(groups_test)),
            "candidates": int(len(y_test)),
            "source_queries": test_source_queries,
            "excluded_queries": test_excluded_queries,
            "first_timestamp": int(test["timestamp"].min()),
            "position_baseline": ranking_metrics(
                -X_test[:, position_index], y_test, groups_test
            ),
            "lightgbm": ranking_metrics(ranker.predict(X_test), y_test, groups_test),
        }
    ranker.validation_report = report
    train_config.output_dir.mkdir(parents=True, exist_ok=True)
    ranker.save(train_config.output_dir / f"{train_config.model_name}_model.txt")
    (train_config.output_dir / f"{train_config.model_name}_report.json").write_text(
        json.dumps(report, indent=2) + "\n"
    )
    (train_config.output_dir / f"{train_config.model_name}_importance.json").write_text(
        json.dumps(dict(zip(ranker.feature_names, map(int, ranker.model.feature_importances_))), indent=2) + "\n"
    )
    logger.info("Validation: %s", json.dumps(report, sort_keys=True))
    return ranker


def main() -> None:
    parser = argparse.ArgumentParser(description="Train a clickout candidate LightGBM ranker")
    parser.add_argument("--data-dir", default="data/features")
    parser.add_argument("--output-dir", default="data/models")
    parser.add_argument("--model-name", default="B6-candidates")
    parser.add_argument("--num-leaves", type=int, default=31)
    parser.add_argument("--learning-rate", type=float, default=0.05)
    parser.add_argument("--n-estimators", type=int, default=500)
    parser.add_argument("--val-split", type=float, default=0.15)
    args = parser.parse_args()
    root = Path(__file__).resolve().parent.parent
    config = TrainConfig(
        data_dir=root / args.data_dir,
        output_dir=root / args.output_dir,
        model_name=args.model_name,
        val_split=args.val_split,
    )
    model_config = LGBConfig(
        num_leaves=args.num_leaves,
        learning_rate=args.learning_rate,
        n_estimators=args.n_estimators,
    )
    train_model(config, model_config)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    main()
