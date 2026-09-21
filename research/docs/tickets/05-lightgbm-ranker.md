# 05: LightGBM Ranker (B6)

**What to build:** LambdaMART ranking model using LightGBM with all engineered features.

**Blocked by:** 04 (Session-kNN Baseline)

**Status:** ready-for-agent

## Acceptance Criteria

- [ ] LightGBM configured with lambdarank objective
- [ ] Features from all groups (item, context, session, temporal, content) used
- [ ] Train/Val/Test temporal split (70/15/15)
- [ ] Hyperparameter tuning: num_leaves, learning_rate, min_data_in_leaf
- [ ] Model serialized to file
- [ ] Feature importance analysis
- [ ] Training time and memory tracked
