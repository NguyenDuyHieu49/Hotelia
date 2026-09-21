# ML Pipeline Architecture - Hotel Recommendation

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     ML RECOMMENDATION PIPELINE                     │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│   INGESTION   │     │   TRAINING    │     │   SERVING     │
│   MODULE      │     │   MODULE      │     │   MODULE      │
└───────────────┘     └───────────────┘     └───────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│ Data Loader  │     │ Feature Eng   │     │ FastAPI      │
│ Parquet     │     │ Transformer   │     │ Ranking API   │
│ Validator   │     │ Baselines     │     │ Cache        │
└───────────────┘     └───────────────┘     └───────────────┘
```

## Module Design

### 1. Data Ingestion Module

**Interface:**
```python
class DataLoader:
    def load_train(self, path: Path) -> pl.DataFrame
    def load_test(self, path: Path) -> pl.DataFrame
    def load_metadata(self, path: Path) -> pl.DataFrame
    def validate_schema(self, df: pl.DataFrame) -> bool
```

**Deep Module Features:**
- Lazy loading for 2GB files
- Schema validation
- Memory-efficient Parquet conversion
- Streaming for large files

**Adapter:** `CSVDataLoader`, `ParquetDataLoader`

---

### 2. Feature Engineering Module

**Interface:**
```python
class FeatureEngine:
    def build_features(self, df: pl.DataFrame) -> pl.DataFrame
    def get_feature_names(self) -> List[str]
    def get_feature_groups(self) -> Dict[str, List[str]]
```

**Feature Groups:**

| Group | Features | Source |
|-------|----------|--------|
| **item** | price, price_rank, is_impression | impressions, prices |
| **context** | city_id, device_type, platform | city, device, platform |
| **session** | session_length, action_count, last_action | session_id aggregations |
| **temporal** | hour, day_of_week, is_weekend | timestamp |
| **content** | star_rating, amenity_count, category | item_metadata |

**Deep Module Features:**
- Composable feature transformers
- Feature versioning
- Caching intermediate results

---

### 3. Training Module

**Interface:**
```python
class RankingTrainer:
    def train_baseline(self, name: str, config: dict) -> Model
    def train_lgb(self, config: LGBConfig) -> LGBMRanker
    def evaluate(self, model: Model, test_df: pl.DataFrame) -> Metrics
```

**Baselines:**

| Code | Name | Interface |
|------|------|-----------|
| B0 | Random/Impression | `predict_random(df) -> rankings` |
| B1 | Popularity | `predict_popularity(df) -> rankings` |
| B2 | Content+Context | `predict_content(df) -> rankings` |
| B4 | Session-kNN | `predict_session_knn(df) -> rankings` |
| B6 | LightGBM | `predict_lgb(df) -> rankings` |

---

### 4. Evaluation Module

**Interface:**
```python
class Evaluator:
    def compute_ndcg(self, predictions: np.ndarray, labels: np.ndarray) -> float
    def compute_mrr(self, predictions: np.ndarray, labels: np.ndarray) -> float
    def compute_hit_rate(self, predictions: np.ndarray, labels: np.ndarray, k: int) -> float
    def generate_report(self, results: Dict[str, Metrics]) -> Report
```

**Metrics:**

| Metric | Formula | Use Case |
|--------|---------|----------|
| NDCG@K | Normalized DCG at K | Primary metric |
| MRR@K | Mean Reciprocal Rank | Secondary |
| Hit@K | % of queries with positive in top K | Business |

---

### 5. Serving Module

**Interface:**
```python
class RankingAPI:
    async def rank(self, context: RankingContext) -> RankingResponse
    async def health(self) -> HealthStatus
```

---

## Data Flow

```
train.csv (2GB)
     │
     ▼
┌─────────────┐
│ CSV Loader  │  ← Lazy reading, chunk processing
└─────────────┘
     │
     ▼
┌─────────────┐
│  Parquet   │  ← Convert to columnar format
└─────────────┘
     │
     ▼
┌─────────────┐
│  Feature    │  ← Transform to features
│  Engineer   │
└─────────────┘
     │
     ▼
┌─────────────┐
│  Train/Val │  ← Split by time
│   Split     │
└─────────────┘
     │
     ▼
┌─────────────┐
│   Model     │  ← Train baselines + LGBM
│   Train     │
└─────────────┘
     │
     ▼
┌─────────────┐
│  Evaluate   │  ← Compute NDCG, MRR
└─────────────┘
```

---

## API Design (Serving)

### POST /rank
```json
{
  "session_id": "abc123",
  "city_id": 1234,
  "device": "mobile",
  "platform": "ios",
  "candidate_items": ["item_1", "item_2", "item_3"],
  "timestamp": "2026-09-21T10:00:00Z"
}
```

---

## Key Design Decisions

1. **Polars over Pandas**: Better memory efficiency for 2GB data
2. **Lazy evaluation**: Process data in chunks
3. **Feature versioning**: Track feature changes
4. **Model serialization**: LightGBM native format
5. **API contract**: Strict request/response schemas

---

## File Structure

```
research/
├── scripts/
│   ├── ingest.py         # DataLoader
│   ├── features.py       # FeatureEngine
│   ├── train.py          # RankingTrainer
│   └── evaluate.py       # Evaluator
├── src/
│   └── hotel_rec/
│       ├── data/
│       │   ├── loader.py
│       │   └── validator.py
│       ├── features/
│       │   ├── base.py
│       │   ├── item.py
│       │   ├── context.py
│       │   └── session.py
│       ├── models/
│       │   ├── baseline.py
│       │   ├── session_knn.py
│       │   └── lightgbm.py
│       └── serving/
│           ├── api.py
│           └── cache.py
└── tests/
    ├── test_features.py
    ├── test_models.py
    └── test_integration.py
```
