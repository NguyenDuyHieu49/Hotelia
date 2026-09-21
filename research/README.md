# Research: Hotel Recommendation System

## Project Structure

```
research/
├── data/
│   ├── raw/              # Original dataset
│   ├── processed/        # Cleaned data
│   └── features/         # Engineered features
├── notebooks/
│   ├── 01_data_audit.ipynb
│   ├── 02_feature_engineering.ipynb
│   ├── 03_baseline_models.ipynb
│   └── 04_evaluation.ipynb
├── models/
│   ├── baselines/        # B0-B7 models
│   └── artifacts/        # Serialized models
├── scripts/
│   ├── download_data.py
│   ├── audit_data.py
│   ├── train.py
│   └── evaluate.py
├── results/
│   ├── raw/             # Raw experiment outputs
│   └── derived/         # Tables and plots
└── requirements.txt
```

## Quick Start

### 1. Setup Environment
```bash
cd research
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
```

### 2. Download Dataset
```bash
python scripts/download_data.py --dataset trivago
```

### 3. Run Audit
```bash
python scripts/audit_data.py --dataset trivago
```

### 4. Train Baselines
```bash
python scripts/train.py --models B1,B2,B4,B6
```

### 5. Evaluate
```bash
python scripts/evaluate.py --model B6
```

## Datasets

### Trivago RecSys Challenge 2019 (Primary)
- Source: https://recsys.trivago.cloud/
- Task: Predict click-out from impressions
- Metrics: MRR

### Expedia Personalized Sort (Backup)
- Source: https://www.kaggle.com/c/expedia-personalized-sort
- Task: Rank hotels in search results
- Metrics: NDCG

## Baselines

| Code | Method | Description |
|------|--------|-------------|
| B0 | Impression Order | Original ranking |
| B1 | Context Popularity | Popularity by city |
| B2 | Content + Context | Amenity matching |
| B4 | Session-kNN | Similar sessions |
| B6 | LambdaMART | LightGBM ranker |

## Metrics

- **MRR@K**: Mean Reciprocal Rank
- **NDCG@K**: Normalized DCG
- **Hit@K**: Proportion of queries with positive in top K

## References

- Adomavicius & Tuzhilin (2011) - Context-aware recommender systems
- Ludewig & Jannach (2018) - Session-based recommendation evaluation
- RecSys Challenge 2019 - Trivago hotel recommendation
