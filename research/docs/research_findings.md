# Research Findings: ML Approaches for Hotel Recommendation

## Project Overview

This research investigates machine learning approaches for hotel ranking recommendation using the **Expedia Personalized Sort dataset**. The dataset contains user interaction logs with columns: `user_id`, `session_id`, `timestamp`, `step`, `action_type`, `reference`, `platform`, `city`, `device`, `current_filters`, `impressions`, and `prices`.

---

## 1. Session-Based Recommendation

Session-based recommendation predicts user preferences within an ongoing browsing session without relying on long-term user profiles.

### 1.1 Session-kNN (Nearest Neighbors)

**Approach:** Find similar past sessions based on item co-occurrence or item sequences, then recommend items from those sessions.

**Implementation:**
- Build item-to-item similarity matrix using session data
- For current session, find k most similar sessions
- Aggregate candidate items from similar sessions, weighted by similarity

**Variants:**
- **Item-kNN:** Based on item co-occurrence within sessions
- **Session-kNN:** Based on entire session similarity
- **Sequential Session-kNN:** Accounts for temporal order of actions

**Pseudocode:**
```
current_session = [item1, item2, item3]
similar_sessions = find_k_nearest(current_session, k=500)
candidates = {}
for sim_session in similar_sessions:
    for item in sim_session:
        if item not in current_session:
            candidates[item] += similarity_score
return top_k(candidates)
```

### 1.2 RNN-Based Approaches

**Architecture:** Use GRUs or LSTMs to model sequential user behavior within sessions.

**Key Papers:**
- **GRU4Rec** (Hidasi et al., 2015): First RNN-based session recommendation model
- **GRU4Rec+** (Hidasi & Karatzoglou, 2018): Improved version with additional features

**Model Structure:**
```
Input: [item1, item2, ..., item_t]
Embedding Layer -> GRU/LSTM -> Output: next item prediction
```

**For Expedia Data:**
- Input: Sequence of hotel references clicked/viewed in session
- Output: Next hotel to recommend
- Additional features: action_type, platform, device, price

### 1.3 Transformer-Based Approaches

**Key Models:**
- **BERT4Rec** (Sun et al., 2019): Uses bidirectional Transformer with masked language modeling
- **SSE-STR** (Xie et al., 2022): State Space Enhanced Sequential Transformer

**Architecture Benefits:**
- Captures long-range dependencies better than RNNs
- Parallel computation for faster training
- Self-attention can model complex item relationships

**For Hotel Recommendation:**
- Use hotel item embeddings
- Incorporate contextual features (device, location, price) as additional tokens
- Consider positional encoding for session timeline

### 1.4 Key Findings from Ludewig & Jannach (2018)

**Paper:** "On the Robustness of Item-based Session-based Recommendation Algorithms" (ACM RecSys 2018)

**Key Insights:**
1. Simple item-based methods (session-kNN) often match or outperform complex neural approaches
2. **Hybrid approaches** combining content features with collaborative signals perform well
3. **Evaluation matters:** Offline evaluation may not reflect online performance
4. Re-ranking candidates from simple models with neural networks can be effective

**Baseline Algorithms for Comparison:**
| Algorithm | Description | Complexity |
|-----------|-------------|------------|
| Pop | Recommend most popular items | O(1) |
| SessionPop | Popular items within session | O(n) |
| Item-kNN | Item co-occurrence based | O(n) |
| Session-kNN | Session similarity based | O(n log k) |
| VSKNN | Visual, sequential, known item-kNN | O(n) |

---

## 2. Context-Aware Ranking

### 2.1 Context Dimensions (from Expedia Data)

Based on **Adomavicius & Tuzhilin (2011)** framework:

**User Context:**
- `device`: Desktop, Mobile, Tablet
- Historical preferences (derived from `user_id`)

**Search Context:**
- `city`: Destination city
- `current_filters`: Applied filters
- `timestamp`: Time of search (weekday/weekend, season)

**Platform Context:**
- `platform`: Web, App, Mobile Web
- Session characteristics (`session_id`, `step`)

### 2.2 Contextual Pre-Filtering vs Post-Filtering

**Pre-Filtering Approach:**
```
For each recommendation request:
    1. Filter training data to relevant context
    2. Build context-specific model
    3. Generate recommendations
```

**Post-Filtering Approach:**
```
1. Generate base recommendations (context-agnostic)
2. Filter/re-rank based on context
3. Return context-appropriate results
```

**Hybrid (Recommended for Expedia):**
- Use context as features in the ranking model
- LightGBM handles feature interactions automatically

### 2.3 Feature Engineering from Context

**Device Features:**
- Is mobile device
- Device type encoding
- Device-platform interaction

**Temporal Features:**
- Hour of day, day of week
- Is weekend, is holiday season
- Time since last booking intent

**Location Features:**
- City embeddings
- City popularity metrics
- Distance from user location (if available)

---

## 3. LightGBM LambdaMART for Ranking

### 3.1 Why LambdaMART?

- Efficient handling of large-scale click data
- Native support for ranking objectives
- Excellent feature importance interpretation
- Handles categorical features natively
- Fast training and inference

### 3.2 LightGBM Ranking API

```python
import lightgbm as lgb
from sklearn.model_selection import GroupKFold

# Prepare data with query groups
# Each query (session) has multiple items (hotels)
# Label: 0 (not clicked), 1 (clicked), 2+ (stronger signals)

train_data = lgb.Dataset(
    X_train,
    label=y_train,
    group=query_groups,  # Number of items per query
    categorical_feature=['device', 'city', 'platform', 'action_type']
)

# Ranking parameters
params = {
    'objective': 'lambdarank',
    'metric': 'ndcg',
    'ndcg_eval_at': [1, 3, 5, 10],
    'boosting_type': 'gbdt',
    'num_leaves': 63,
    'learning_rate': 0.05,
    'feature_fraction': 0.8,
    'bagging_fraction': 0.8,
    'bagging_freq': 5,
    'verbose': -1,
}

# Train with early stopping
model = lgb.train(
    params,
    train_data,
    num_boost_round=1000,
    valid_sets=[train_data, valid_data],
    callbacks=[lgb.early_stopping(50), lgb.log_evaluation(100)]
)
```

### 3.3 Feature Engineering for LightGBM

**Item Features:**
- Price, star rating, amenities count
- Historical click-through rate (CTR)
- Booking conversion rate
- Popularity metrics

**Context Features:**
- Device type (one-hot or native categorical)
- Platform
- Time features (hour, day_of_week, is_weekend)
- City popularity

**User-Session Features:**
- Session length (number of steps)
- Previous action types
- Time spent on session
- Number of unique cities searched

**Interaction Features:**
- Price × Device (mobile users may prefer cheaper options)
- City × IsWeekend (destination preferences change)
- Price × StarRating (value perception)

**Temporal Features:**
- Recency of item popularity
- Seasonal booking patterns
- Time since last user interaction

### 3.4 Label Construction

From Expedia data `action_type` column:
```python
# Binary labels
y = (action_type == 'click').astype(int)

# Graded relevance for LambdaRank
# 0: not relevant (impression, no click)
# 1: click
# 2: book (if available in action_type)
```

---

## 4. Evaluation Metrics

### 4.1 NDCG (Normalized Discounted Cumulative Gain)

**Definition:**
```
DCG@k = sum(i=1 to k) [rel_i / log2(i+1)]
NDCG@k = DCG@k / IDCG@k
```

Where `IDCG` is ideal DCG (items ranked by relevance).

**Interpretation:** Measures ranking quality considering both relevance and position. NDCG@10 is standard for top-10 recommendations.

### 4.2 MRR (Mean Reciprocal Rank)

**Definition:**
```
MRR = (1/|Q|) * sum(q in Q) [1 / rank_q]
```

Where `rank_q` is the position of first relevant item.

**Interpretation:** Focuses on first-hit accuracy. Good for "single best item" scenarios.

### 4.3 Hit@K (Hit Rate at K)

**Definition:**
```
Hit@K = (1/|Q|) * sum(q in Q) [1 if relevant_item in top_k else 0]
```

**Variants:**
- Hit@1, Hit@3, Hit@5, Hit@10, Hit@20
- MRR@K (MRR calculated within top-K)

**Interpretation:** Binary measure of top-K coverage.

### 4.4 Additional Metrics

- **MAP (Mean Average Precision):** Precision at different recall levels
- **AUC:** Ranking accuracy measure
- **Coverage:** What fraction of items can be recommended
- **Diversity:** Dissimilarity between recommended items

---

## 5. Baseline Approaches (B0-B6)

### B0: Random Baseline
- Randomly shuffle hotel rankings
- Useful for establishing lower bound

### B1: Popularity Baseline
- Rank hotels by global popularity (click count)
- Simple, often hard to beat

### B2: Price-Only Baseline
- Rank by price ascending/descending
- Establishes simple feature baseline

### B3: Session-Agnostic CTR
- Rank by historical hotel CTR per city
- Contextual but not session-specific

### B4: Session-kNN
- Find similar sessions, aggregate recommendations
- Strong baseline from Ludewig & Jannach

### B5: LightGBM with Basic Features
- Item features + context features
- No user history or session sequence

### B6: LightGBM with Full Features
- All engineered features
- Session sequence features
- Temporal patterns

---

## 6. Recommended Approach for Expedia Dataset

### 6.1 Data Preprocessing

```python
# Session identification
# A session is defined by session_id

# Item representation
# Each row = one item impression in a search result
# Multiple items per session per step

# Label creation
# Relevant = clicked or booked
# Not relevant = only impressed
```

### 6.2 Feature Pipeline

```
Raw Data
    |
    v
Session Aggregation --> Session features
    |
    v
Item Aggregation --> Item popularity features
    |
    v
Context Enrichment --> Device, time, platform features
    |
    v
Cross Features --> Interactions
    |
    v
Final Feature Matrix
```

### 6.3 Two-Stage Approach (Recommended)

**Stage 1: Candidate Generation**
- Session-kNN to generate candidate hotels
- Or: Top-K hotels per city from history

**Stage 2: Learning-to-Rank**
- LightGBM LambdaMART to rank candidates
- Use all context and session features

### 6.4 Cross-Validation Strategy

```python
from sklearn.model_selection import GroupKFold

# Group by session_id to prevent data leakage
# Sessions should not be split across train/test

gkf = GroupKFold(n_splits=5)
for train_idx, val_idx in gkf.split(X, y, groups=sessions):
    # Train on train_idx, validate on val_idx
    # GroupKFold ensures complete sessions stay together
```

---

## 7. Key References

### 7.1 Session-Based Recommendation

1. **Ludewig & Jannach (2018)** - "Evaluation of Session-Based Recommendation Algorithms"
   - DOI: 10.1145/3240323.3240379
   - URL: https://arxiv.org/abs/1803.09587

2. **Hidasi et al. (2015)** - "Session-based Recommendations with Recurrent Neural Networks"
   - URL: https://arxiv.org/abs/1511.06939

3. **Quadrana et al. (2017)** - "Personalizing Session-based Recommendations with Hierarchical Recurrent Neural Networks"
   - DOI: 10.1145/2959100.2959162

4. **Sun et al. (2019)** - "BERT4Rec: Sequential Recommendation with Bidirectional Encoder Representations"
   - URL: https://arxiv.org/abs/1904.06690

### 7.2 Context-Aware Recommenders

1. **Adomavicius & Tuzhilin (2011)** - "Context-Aware Recommender Systems"
   - DOI: 10.1145/1944339.1944346
   - URL: https://dl.acm.org/10.1145/1944339.1944346

2. **Baltrunas et al. (2011)** - "Context-related item representations for context-aware recommendation"
   - URL: https://ceur-ws.org/Vol-740/baltrunas.pdf

### 7.3 Learning to Rank

1. **LightGBM Documentation - LambdaRank**
   - URL: https://lightgbm.readthedocs.io/en/latest/Parameters.html

2. **Burges et al. (2005)** - "Learning to Rank with Gradient Descent"
   - URL: https://www.microsoft.com/en-us/research/publication/learning-to-rank-using-gradient-descent/

### 7.4 Evaluation

1. **Krichene & Renderer (2018)** - "On Overfitting and Underfitting in Learning to Rank"
   - URL: https://arxiv.org/abs/1805.04567

2. **Ferrante et al. (2022)** - "A Recurrent BERT-based Model for Session-based Recommendation"
   - DOI: 10.1007/978-3-030-94210-8_29

---

## 8. Implementation Checklist

### Data Processing
- [ ] Parse action types into relevance labels
- [ ] Aggregate session-level features
- [ ] Create temporal features (hour, day, weekend)
- [ ] Encode categorical features (device, platform, city)

### Baseline Implementations
- [ ] B0: Random baseline
- [ ] B1: Popularity baseline
- [ ] B2: Session-kNN baseline
- [ ] B3: Basic LightGBM

### Advanced Models
- [ ] LightGBM LambdaMART with full features
- [ ] Feature importance analysis
- [ ] Hyperparameter tuning

### Evaluation
- [ ] Implement NDCG@K
- [ ] Implement MRR
- [ ] Implement Hit@K
- [ ] Cross-validation with GroupKFold

---

## 9. Expected Challenges

1. **Cold Start:** New users/sessions with limited history
   - Solution: Use session-kNN fallback, popularity-based features

2. **Feature Leakage:** Session information should not leak from future steps
   - Solution: Use only past data when creating features

3. **Label Imbalance:** Most impressions are not clicked
   - Solution: Use appropriate sampling or class weights

4. **Computational Cost:** Large dataset
   - Solution: Sample sessions, use LightGBM efficiency

---

*Research completed: September 2026*
*Prepared for: Do An Co So - Hotel Recommendation Project*
