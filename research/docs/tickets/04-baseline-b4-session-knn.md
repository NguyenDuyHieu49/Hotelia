# 04: Session-kNN Baseline (B4)

**What to build:** Session-based kNN ranking model using weighted session similarity.

**Blocked by:** 03 (Baseline B0-B2)

**Status:** ready-for-agent

## Acceptance Criteria

- [ ] Session representation: vector of item interactions
- [ ] Similarity function: weighted overlap with exponential decay
- [ ] Top-K neighbor selection (K=50, K=100)
- [ ] Score aggregation from neighbors
- [ ] Fallback to B1 for cold sessions
- [ ] Results comparable with B0-B2 baselines
