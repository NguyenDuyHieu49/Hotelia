"""
FastAPI Ranking Service for Hotel Recommendations
Real-time ranking API with LightGBM model serving.
"""

import time
import logging
from pathlib import Path
from typing import List, Optional
from datetime import datetime

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============================================================================
# Pydantic Models
# ============================================================================

class RankingRequest(BaseModel):
    """Request model for ranking endpoint."""
    session_id: str = Field(..., description="Unique session identifier")
    city_id: int = Field(..., description="City identifier")
    device: str = Field(..., description="Device type: mobile, desktop, tablet")
    platform: str = Field(..., description="Platform: ios, android, web")
    candidate_items: List[str] = Field(..., description="List of candidate item IDs to rank")
    timestamp: Optional[datetime] = Field(None, description="Request timestamp")


class RankedItem(BaseModel):
    """Single ranked item in response."""
    item_id: str
    score: float
    rank: int


class RankingResponse(BaseModel):
    """Response model for ranking endpoint."""
    session_id: str
    ranked_items: List[RankedItem]
    model_version: str
    latency_ms: float
    fallback_used: bool


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    model_loaded: bool
    version: str


# ============================================================================
# FastAPI App
# ============================================================================

app = FastAPI(
    title="Hotel Ranking API",
    description="Real-time hotel recommendation ranking service",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global state
class RankingService:
    """Ranking service state."""

    def __init__(self):
        self.model = None
        self.model_path: Optional[Path] = None
        self.model_version: str = "B6-v1.0"
        self.popularity_scores: dict = {}
        self.fallback_used: bool = False

    def load_model(self, model_path: Path):
        """Load ranking model."""
        import lightgbm as lgb

        if not model_path.exists():
            logger.warning(f"Model not found at {model_path}, using fallback")
            self.fallback_used = True
            return

        try:
            booster = lgb.Booster(model_file=str(model_path))
            self.model = booster
            self.model_path = model_path
            self.fallback_used = False
            logger.info(f"Model loaded from {model_path}")
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            self.fallback_used = True

    def load_popularity(self, popularity_path: Path):
        """Load popularity scores for fallback."""
        import json

        if popularity_path.exists():
            with open(popularity_path) as f:
                self.popularity_scores = json.load(f)
            logger.info(f"Loaded popularity scores: {len(self.popularity_scores)} items")

    def extract_features(self, request: RankingRequest) -> dict:
        """Extract features from request context."""
        features = {
            "city_id": request.city_id,
            "device_type": {"mobile": 0, "desktop": 1, "tablet": 2}.get(request.device, 99),
            "platform_encoded": {"ios": 0, "android": 1, "web": 2}.get(request.platform, 99),
            "filter_count": 0,  # Placeholder
            "hour": request.timestamp.hour if request.timestamp else 12,
            "day_of_week": request.timestamp.weekday() + 1 if request.timestamp else 1,
            "is_weekend": request.timestamp.weekday() >= 5 if request.timestamp else False,
        }
        return features

    def rank_items(self, request: RankingRequest) -> List[RankedItem]:
        """Rank candidate items."""
        if self.model is None:
            # Fallback to popularity
            return self._rank_by_popularity(request.candidate_items)

        # Feature extraction for each item
        base_features = self.extract_features(request)
        scores = []

        for item_id in request.candidate_items:
            # Build feature vector (simplified)
            features = [
                base_features.get("avg_price", 100.0),
                base_features.get("city_id", 0),
                base_features.get("device_type", 0),
                base_features.get("platform_encoded", 0),
                base_features.get("filter_count", 0),
                base_features.get("session_length", 5),
                base_features.get("action_count", 5),
                base_features.get("click_count", 1),
                base_features.get("last_action_type_encoded", 0),
                base_features.get("hour", 12),
                base_features.get("day_of_week", 1),
                1.0 if base_features.get("is_weekend") else 0.0,
            ]

            try:
                score = self.model.predict([features])[0]
            except Exception:
                score = self.popularity_scores.get(item_id, 0.0)

            scores.append((item_id, score))

        # Sort by score descending
        scores.sort(key=lambda x: x[1], reverse=True)

        # Create ranked items
        ranked_items = [
            RankedItem(item_id=item_id, score=score, rank=rank)
            for rank, (item_id, score) in enumerate(scores, 1)
        ]

        return ranked_items

    def _rank_by_popularity(self, items: List[str]) -> List[RankedItem]:
        """Fallback ranking by popularity."""
        scored = [
            (item_id, self.popularity_scores.get(item_id, 0.0))
            for item_id in items
        ]
        scored.sort(key=lambda x: x[1], reverse=True)

        return [
            RankedItem(item_id=item_id, score=score, rank=rank)
            for rank, (item_id, score) in enumerate(scored, 1)
        ]


# Initialize service
service = RankingService()


# ============================================================================
# API Endpoints
# ============================================================================

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        model_loaded=service.model is not None,
        version=service.model_version
    )


@app.post("/rank", response_model=RankingResponse)
async def rank_items(request: RankingRequest):
    """
    Rank candidate hotel items for a session.

    Returns items sorted by predicted relevance score.
    """
    start_time = time.time()

    try:
        ranked_items = service.rank_items(request)

        latency_ms = (time.time() - start_time) * 1000

        return RankingResponse(
            session_id=request.session_id,
            ranked_items=ranked_items,
            model_version=service.model_version,
            latency_ms=round(latency_ms, 2),
            fallback_used=service.fallback_used
        )

    except Exception as e:
        logger.error(f"Error ranking items: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.on_event("startup")
async def startup_event():
    """Load models on startup."""
    base_dir = Path(__file__).parent.parent

    # Load LightGBM model
    model_path = base_dir / "data/models/B6_model.txt"
    service.load_model(model_path)

    # Load popularity for fallback
    popularity_path = base_dir / "data/baselines/baseline_B1.parquet"
    if popularity_path.exists():
        import polars as pl
        df = pl.read_parquet(popularity_path)
        if "reference" in df.columns:
            service.popularity_scores = {
                row["reference"]: row["score"]
                for row in df.iter_rows(named=True)
            }

    logger.info("Ranking service started")


# ============================================================================
# Main
# ============================================================================

def main():
    """Run the FastAPI server."""
    uvicorn.run(
        "serving:app",
        host="0.0.0.0",
        port=8000,
        reload=False
    )


if __name__ == "__main__":
    main()
