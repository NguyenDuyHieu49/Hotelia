# 07: FastAPI Ranking Service

**What to build:** FastAPI service for real-time ranking with model loading and caching.

**Blocked by:** 06 (Evaluation Metrics)

**Status:** ready-for-agent

## Acceptance Criteria

- [ ] FastAPI app with POST /rank endpoint
- [ ] Request validation: session_id, city_id, device, platform, candidate_items, timestamp
- [ ] Response: ranked_items, model_version, latency_ms, fallback_used
- [ ] Model loading from serialized file
- [ ] Feature extraction from request context
- [ ] Fallback to B1 (popularity) when model unavailable
- [ ] Health check endpoint
- [ ] Request logging
- [ ] p95 latency < 100ms
