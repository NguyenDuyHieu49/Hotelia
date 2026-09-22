"""
Session-kNN Baseline (B4) for Hotel Recommendation
Uses weighted session similarity for ranking.
"""

import logging
from pathlib import Path
from dataclasses import dataclass
from typing import Dict, List, Tuple, Optional, Set

import numpy as np
import polars as pl

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class SessionKNNConfig:
    """Configuration for Session-kNN."""
    k: int = 50  # Number of neighbors
    decay: float = 0.7  # Time decay factor
    min_overlap: int = 1  # Minimum item overlap


class Session:
    """Represents a user session with interactions."""

    def __init__(self, session_id: str, items: List[str], timestamp: int):
        self.session_id = session_id
        self.items = items
        self.timestamp = timestamp
        self.item_set = set(items)

    def similarity(self, other: "Session") -> float:
        """
        Compute weighted overlap similarity.

        Similarity = sum(min(count_i, count_other_i) * decay^(time_diff))
                     / min(len(self), len(other))
        """
        if not self.item_set or not other.item_set:
            return 0.0

        # Compute overlap
        common_items = self.item_set & other.item_set
        if len(common_items) < 1:
            return 0.0

        # Weighted overlap
        overlap = sum(
            min(self.items.count(item), other.items.count(item))
            for item in common_items
        )

        # Normalize by smaller session length
        max_len = min(len(self.items), len(other.items))

        return overlap / max_len if max_len > 0 else 0.0


class SessionKNN:
    """
    B4: Session-kNN Baseline

    For each target session, find k most similar sessions and
    use their clicked items for ranking.
    """

    def __init__(self, config: SessionKNNConfig):
        self.config = config
        self.sessions: Dict[str, Session] = {}
        self.session_items: Dict[str, Set[str]] = {}  # session_id -> clicked items

    def fit(self, df: pl.DataFrame) -> "SessionKNN":
        """
        Build session index from training data.

        Only includes clickout actions for session representation.
        """
        logger.info("Building session index...")

        # Get clickout actions (positive interactions)
        clickouts = df.filter(
            pl.col("action_type") == "clickout item"
        ).select(["session_id", "reference", "timestamp"])

        # Build sessions
        session_groups = clickouts.group_by("session_id").agg([
            pl.col("reference").alias("items"),
            pl.col("timestamp").max().alias("timestamp")
        ])

        for row in session_groups.iter_rows(named=True):
            session_id = row["session_id"]
            items = row["items"]
            timestamp = row["timestamp"]

            self.sessions[session_id] = Session(session_id, items, timestamp)
            self.session_items[session_id] = set(items)

        logger.info(f"  Built {len(self.sessions):,} sessions")

        return self

    def find_neighbors(self, session: Session, exclude_self: bool = True) -> List[Tuple[str, float]]:
        """
        Find k most similar sessions.

        Returns list of (session_id, similarity_score) tuples.
        """
        similarities = []

        for other_id, other_session in self.sessions.items():
            if exclude_self and other_id == session.session_id:
                continue

            # Compute similarity
            sim = session.similarity(other_session)
            if sim > 0:
                similarities.append((other_id, sim))

        # Sort by similarity descending
        similarities.sort(key=lambda x: x[1], reverse=True)

        # Return top k
        return similarities[:self.config.k]

    def get_scores(self, session: Session) -> Dict[str, float]:
        """
        Get recommendation scores for items based on neighbor sessions.

        Score = sum of (similarity * is_clicked_in_neighbor) for all neighbors.
        """
        neighbors = self.find_neighbors(session)

        scores: Dict[str, float] = {}

        for neighbor_id, sim in neighbors:
            neighbor_items = self.session_items.get(neighbor_id, set())

            for item in neighbor_items:
                if item not in scores:
                    scores[item] = 0.0
                scores[item] += sim

        return scores

    def predict(self, df: pl.DataFrame) -> pl.DataFrame:
        """
        Predict scores for test sessions.

        Returns DataFrame with session_id, item_id, score columns.
        """
        logger.info("Predicting with Session-kNN...")

        # Get test sessions
        test_sessions = df.select("session_id").unique()

        results = []

        for row in test_sessions.iter_rows(named=True):
            session_id = row["session_id"]

            # Get items for this session
            session_data = df.filter(pl.col("session_id") == session_id)
            items = session_data.select("reference").to_series().to_list()
            timestamp = session_data.select("timestamp").max()

            if not items:
                continue

            session = Session(session_id, items, timestamp)
            scores = self.get_scores(session)

            # Add results
            for item, score in scores.items():
                results.append({
                    "session_id": session_id,
                    "item_id": item,
                    "score": score
                })

        result_df = pl.DataFrame(results)

        logger.info(f"  Generated {len(result_df):,} predictions")

        return result_df


class FallbackPopularity:
    """
    Fallback to popularity when session has no neighbors.
    """

    def __init__(self):
        self.popularity: Dict[str, float] = {}

    def fit(self, df: pl.DataFrame) -> "FallbackPopularity":
        """Compute item popularity."""
        clicks = df.filter(
            pl.col("action_type") == "clickout item"
        ).group_by("reference").agg([
            pl.len().alias("count")
        ])

        total = clicks["count"].sum()
        if total > 0:
            self.popularity = {
                row["reference"]: row["count"] / total
                for row in clicks.iter_rows(named=True)
            }

        return self

    def predict(self, df: pl.DataFrame) -> pl.DataFrame:
        """Return popularity scores."""
        return pl.DataFrame({
            "item_id": list(self.popularity.keys()),
            "score": list(self.popularity.values())
        })


def main():
    """Main entry point."""
    import argparse

    parser = argparse.ArgumentParser(description="Run Session-kNN")
    parser.add_argument("--data-dir", default="data/features",
                        help="Directory with feature files")
    parser.add_argument("--output-dir", default="data/baselines",
                        help="Output directory")
    parser.add_argument("--k", type=int, default=50,
                        help="Number of neighbors")
    args = parser.parse_args()

    base_dir = Path(__file__).parent.parent
    data_dir = base_dir / args.data_dir
    output_dir = base_dir / args.output_dir
    output_dir.mkdir(parents=True, exist_ok=True)

    logger.info("=" * 60)
    logger.info("SESSION-KNN BASELINE (B4)")
    logger.info("=" * 60)

    # Load data
    train = pl.read_parquet(data_dir / "train_features.parquet")
    test = pl.read_parquet(data_dir / "test_features.parquet")

    logger.info(f"Train: {len(train):,} rows")
    logger.info(f"Test: {len(test):,} rows")

    # Train Session-kNN
    config = SessionKNNConfig(k=args.k)
    model = SessionKNN(config)
    model.fit(train)

    # Predict
    results = model.predict(test)

    # Save
    output_path = output_dir / "baseline_B4.parquet"
    results.write_parquet(output_path)
    logger.info(f"Saved to {output_path}")

    logger.info("\n" + "=" * 60)
    logger.info("COMPLETE")
    logger.info("=" * 60)


if __name__ == "__main__":
    main()
