"""
LightGBM Ranker (B6) for Hotel Recommendation
Uses LambdaMART objective for learning-to-rank.
"""

import logging
import json
from pathlib import Path
from dataclasses import dataclass
from typing import Dict, List, Tuple, Optional

import numpy as np
import polars as pl
import lightgbm as lgb

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class LGBConfig:
    """LightGBM configuration for ranking."""
    num_leaves: int = 63
    learning_rate: float = 0.05
    feature_fraction: float = 0.8
    bagging_fraction: float = 0.8
    bagging_freq: int = 5
    min_child_samples: int = 50
    n_estimators: int = 100
    ndcg_eval_at: List[int] = None

    def __post_init__(self):
        if self.ndcg_eval_at is None:
            self.ndcg_eval_at = [5, 10]


@dataclass
class TrainConfig:
    """Training configuration."""
    data_dir: Path
    output_dir: Path
    model_name: str = "B6"
    val_split: float = 0.15
    seed: int = 42


class RankingDataset:
    """Prepare data for LightGBM ranking."""

    FEATURE_COLUMNS = [
        # Item features
        "avg_price",
        # Context features
        "city_id",
        "device_type",
        "platform_encoded",
        "filter_count",
        # Session features
        "session_length",
        "action_count",
        "click_count",
        "last_action_type_encoded",
        # Temporal features
        "hour",
        "day_of_week",
        "is_weekend",
    ]

    def __init__(self):
        self.feature_columns = self.FEATURE_COLUMNS

    def prepare(self, df: pl.DataFrame, is_train: bool = True) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Prepare features and labels for ranking.

        Returns:
            X: Feature matrix (n_samples, n_features)
            y: Labels (n_samples,)
            groups: Group sizes for ranking (for LightGBM)
        """
        # Filter to clickout actions
        df = df.filter(pl.col("action_type") == "clickout item")

        # Get features
        feature_cols = [col for col in self.feature_columns if col in df.columns]

        X = df.select(feature_cols).to_numpy()

        # Get labels (1 for clicked, 0 otherwise)
        y = df.select("label").to_numpy().flatten() if "label" in df.columns else np.zeros(len(df))

        # Group by session for ranking
        groups = df.group_by("session_id").len()["len"].to_numpy()

        return X, y, groups

    def get_feature_names(self) -> List[str]:
        """Return feature names."""
        return self.feature_columns


class LGBMRanker:
    """LightGBM Ranker wrapper."""

    def __init__(self, config: LGBConfig):
        self.config = config
        self.model: Optional[lgb.LGBMRanker] = None
        self.feature_names: List[str] = []

    def fit(self, X_train: np.ndarray, y_train: np.ndarray,
            groups_train: np.ndarray) -> "LGBMRanker":
        """
        Train LightGBM ranker.

        Args:
            X_train: Training features
            y_train: Training labels
            groups_train: Group sizes for training
        """
        logger.info("Training LightGBM ranker...")

        # Create model
        self.model = lgb.LGBMRanker(
            objective="lambdarank",
            metric="ndcg",
            boosting_type="gbdt",
            num_leaves=self.config.num_leaves,
            learning_rate=self.config.learning_rate,
            feature_fraction=self.config.feature_fraction,
            bagging_fraction=self.config.bagging_fraction,
            bagging_freq=self.config.bagging_freq,
            min_child_samples=self.config.min_child_samples,
            n_estimators=self.config.n_estimators,
            random_state=42,
            verbose=-1,
        )

        # Train
        self.model.fit(
            X_train, y_train,
            group=groups_train,
        )

        logger.info("Training complete!")

        return self

    def predict(self, X: np.ndarray) -> np.ndarray:
        """Predict scores for ranking."""
        if self.model is None:
            raise ValueError("Model not trained yet!")

        return self.model.predict(X)

    def save(self, path: Path):
        """Save model to file."""
        if self.model is None:
            raise ValueError("Model not trained yet!")

        self.model.booster_.save_model(str(path))
        logger.info(f"Model saved to {path}")

    def load(self, path: Path):
        """Load model from file."""
        booster = lgb.Booster(model_file=str(path))
        self.model = lgb.LGBMRanker()
        self.model._Booster = booster
        logger.info(f"Model loaded from {path}")


def train_model(train_config: TrainConfig, lgb_config: LGBConfig) -> LGBMRanker:
    """
    Full training pipeline.
    """
    logger.info("=" * 60)
    logger.info("LIGHTGBM RANKER TRAINING")
    logger.info("=" * 60)

    # Load data
    train_df = pl.read_parquet(train_config.data_dir / "train_features.parquet")

    logger.info(f"Train: {len(train_df):,} rows")

    # Prepare dataset
    dataset = RankingDataset()

    # Prepare features
    X_train, y_train, groups_train = dataset.prepare(train_df, is_train=True)

    logger.info(f"Features: {X_train.shape[1]}")
    logger.info(f"Groups: {len(groups_train)}")

    # Train model
    ranker = LGBMRanker(lgb_config)
    ranker.fit(X_train, y_train, groups_train)
    ranker.feature_names = dataset.get_feature_names()

    # Save model
    train_config.output_dir.mkdir(parents=True, exist_ok=True)
    model_path = train_config.output_dir / f"{train_config.model_name}_model.txt"
    ranker.save(model_path)

    # Save feature importance
    if ranker.model is not None:
        importance = {k: int(v) for k, v in zip(
            ranker.feature_names,
            ranker.model.feature_importances_
        )}
        importance_path = train_config.output_dir / f"{train_config.model_name}_importance.json"
        with open(importance_path, 'w') as f:
            json.dump(importance, f, indent=2)
        logger.info(f"Feature importance saved to {importance_path}")

    logger.info("\n" + "=" * 60)
    logger.info("TRAINING COMPLETE")
    logger.info("=" * 60)

    return ranker


def main():
    """Main entry point."""
    import argparse

    parser = argparse.ArgumentParser(description="Train LightGBM ranker")
    parser.add_argument("--data-dir", default="data/features",
                        help="Directory with feature files")
    parser.add_argument("--output-dir", default="data/models",
                        help="Output directory for models")
    parser.add_argument("--model-name", default="B6",
                        help="Model name")
    parser.add_argument("--num-leaves", type=int, default=63,
                        help="Number of leaves")
    parser.add_argument("--learning-rate", type=float, default=0.05)
    parser.add_argument("--n-estimators", type=int, default=100)
    args = parser.parse_args()

    base_dir = Path(__file__).parent.parent
    train_config = TrainConfig(
        data_dir=base_dir / args.data_dir,
        output_dir=base_dir / args.output_dir,
        model_name=args.model_name,
    )
    lgb_config = LGBConfig(
        num_leaves=args.num_leaves,
        learning_rate=args.learning_rate,
        n_estimators=args.n_estimators,
    )

    train_model(train_config, lgb_config)


if __name__ == "__main__":
    main()
