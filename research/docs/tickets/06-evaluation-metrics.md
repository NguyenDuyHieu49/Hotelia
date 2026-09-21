# 06: Evaluation Metrics & Analysis

**What to build:** Comprehensive evaluation pipeline for comparing all baselines.

**Blocked by:** 05 (LightGBM Ranker)

**Status:** ready-for-agent

## Acceptance Criteria

- [ ] NDCG@5 and NDCG@10 computed for all baselines
- [ ] MRR@10 computed for all baselines
- [ ] Hit@5 and Hit@10 computed for all baselines
- [ ] Cold-start slice analysis (new users, new items)
- [ ] Short session analysis (1-2 actions)
- [ ] Ablation study: impact of removing session features
- [ ] Bootstrap confidence intervals (95%) for all metrics
- [ ] Results table generated (CSV + Markdown)
- [ ] Comparison charts generated
