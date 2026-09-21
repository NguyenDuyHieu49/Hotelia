# SPEC: ML Hotel Recommendation System

## Problem Statement

Build a hotel recommendation system that ranks hotels based on user context, session behavior, and item features to improve booking conversion compared to baseline impression order.

## Solution

Implement a machine learning pipeline that:
1. Ingests Expedia dataset (2GB train, 535MB test)
2. Engineers session, context, and content features
3. Trains and evaluates baselines (B0-B6) including LightGBM ranker
4. Exposes ranking API for real-time serving
5. Evaluates using NDCG@K and MRR@K metrics

---

## User Stories

### Data & Infrastructure
1. As a data scientist, I want to ingest 2GB CSV data efficiently, so that I can process the full dataset without memory issues
2. As a data scientist, I want to validate schema and data quality, so that I can catch issues early
3. As a data scientist, I want to convert data to Parquet format, so that downstream processing is faster

### Feature Engineering
4. As a data scientist, I want to extract session features, so that I can capture user behavior patterns
5. As a data scientist, I want to extract context features (city, device, platform), so that I can personalize rankings
6. As a data scientist, I want to extract item features (price, amenities, rating), so that I can match user preferences
7. As a data scientist, I want to extract temporal features, so that I can capture time-based patterns
8. As a data scientist, I want to cache engineered features, so that iteration is faster

### Model Training
9. As a data scientist, I want to train B0 (random/impression baseline), so that I have a baseline to compare against
10. As a data scientist, I want to train B1 (popularity baseline), so that I understand simple popularity-based performance
11. As a data scientist, I want to train B2 (content + context), so that I can test feature-based matching
12. As a data scientist, I want to train B4 (session-kNN), so that I can leverage session similarity
13. As a data scientist, I want to train B6 (LightGBM ranker), so that I can learn complex feature interactions
14. As a data scientist, I want to tune hyperparameters, so that I maximize model performance
15. As a data scientist, I want to track experiments, so that I can compare model versions

### Evaluation
16. As a data scientist, I want to compute NDCG@K, so that I can measure ranking quality
17. As a data scientist, I want to compute MRR@K, so that I can measure reciprocal rank performance
18. As a data scientist, I want to compute Hit@K, so that I can measure business-relevant metrics
19. As a data scientist, I want to analyze cold-start slices, so that I understand performance on new users/items
20. As a data scientist, I want to run ablation studies, so that I understand feature importance

### Serving
21. As an API consumer, I want to POST context and candidates, so that I can get ranked results
22. As an API consumer, I want to get ranked hotel list, so that I can display to users
23. As an API consumer, I want fallback to popularity, so that I handle edge cases
24. As an API consumer, I want low latency (<100ms), so that users don't wait

### Integration
25. As a backend developer, I want Node.js to call Python ranking API, so that the mobile app can use recommendations
26. As a backend developer, I want to cache model outputs, so that I reduce latency

---

## Implementation Decisions

### Data Module
- **Format**: CSV → Parquet conversion for memory efficiency
- **Loading**: Lazy loading with Polars for 2GB data
- **Schema validation**: Strict column checking before processing

### Feature Groups

| Group | Features | Source Column |
|-------|----------|---------------|
| `item_features` | `price`, `price_rank`, `price_relative`, `is_clicked` | `impressions`, `prices`, `action_type` |
| `context_features` | `city_id`, `device_type`, `platform`, `filter_count` | `city`, `device`, `platform`, `current_filters` |
| `session_features` | `session_length`, `action_count`, `click_count`, `last_action_type` | `session_id`, `step`, `action_type` |
| `temporal_features` | `hour`, `day_of_week`, `is_weekend` | `timestamp` |
| `content_features` | `star_rating`, `amenity_count`, `category` | `item_metadata.properties` |

### Label Construction
- `action_type == "clickout"` → positive label (1)
- `action_type == "interaction" && reference == item` → positive (1)
- Otherwise → negative (0)

### Train/Val/Test Split
- **Method**: Temporal split by `timestamp`
- **Ratios**: 70% / 15% / 15%
- **Grouping**: All items in same session stay in same split

### Baselines

| Code | Name | Description |
|------|------|-------------|
| B0 | Impression Order | Rank by original impression order |
| B1 | Popularity | Rank by city-based click/popularity score |
| B2 | Content+Context | TF-IDF amenities + context matching |
| B4 | Session-kNN | Weighted overlap with similar sessions |
| B6 | LightGBM | LambdaMART with all features |

### LightGBM Config
```python
lgb_params = {
    "objective": "lambdarank",
    "metric": "ndcg",
    "ndcg_eval_at": [5, 10],
    "num_leaves": 63,
    "learning_rate": 0.05,
    "feature_fraction": 0.8,
    "bagging_fraction": 0.8,
    "bagging_freq": 5,
    "min_data_in_leaf": 50,
    "verbose": -1
}
```

### Evaluation Metrics
- **Primary**: NDCG@5, NDCG@10
- **Secondary**: MRR@10, Hit@5, Hit@10
- **Slices**: Cold-start (new users), Content-cold (new items), Short-session

### API Contract
```python
# Request
class RankingRequest:
    session_id: str
    city_id: int
    device: str  # mobile, desktop, tablet
    platform: str  # ios, android, web
    candidate_items: List[str]
    timestamp: datetime

# Response
class RankingResponse:
    ranked_items: List[RankedItem]  # sorted by score
    model_version: str
    latency_ms: float
    fallback_used: bool
```

### Serving Architecture
```
Node.js API
    │
    ├── GET /recommendations
    │       │
    │       ▼
    │   Python FastAPI (Ranking Service)
    │       │
    │       ├── Check cache (Redis)
    │       ├── Load model (B6)
    │       ├── Extract features
    │       ├── Predict scores
    │       └── Return ranked list
    │
    └── Cache TTL: 5 minutes
```

---

## Testing Decisions

### Unit Tests
- Feature extraction functions
- Metric computation
- Model prediction

### Integration Tests
- Full pipeline: CSV → Features → Model → Metrics
- API endpoint: request → response

### Evaluation Tests
- NDCG computation correctness
- Model ranking quality on known examples

### Test Data
- Use first 100K rows of train.csv for unit tests
- Use full data for integration tests

---

## Out of Scope

- Physical room assignment
- Real payment integration
- User authentication (handled by existing app)
- A/B testing infrastructure
- Model retraining pipeline
- Feature store
- Multi-objective optimization

---

## Further Notes

### Cold-Start Strategy
1. **New user (no history)**: Use B1 (popularity) + context matching
2. **New item (no clicks)**: Use content-based features only
3. **Short session (<3 actions)**: Blend session score with popularity

### Performance Targets
- **Training**: < 30 minutes for full dataset
- **Inference**: < 50ms per request (p95)
- **Memory**: < 8GB RAM for training

### Dataset Stats (Expected)
- ~37M training rows
- ~2.5M test rows
- ~200K unique properties
- ~50K unique users

---

## References

- Research findings: `docs/research_findings.md`
- Architecture: `docs/architecture.md`
- Original PDF: Booking_App.pdf
