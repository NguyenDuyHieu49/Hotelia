# 02: Feature Engineering

**What to build:** Feature extraction pipeline that transforms raw data into ML-ready features for ranking.

**Blocked by:** 01 (Data Ingestion Pipeline)

**Status:** ready-for-agent

## Acceptance Criteria

- [ ] Item features: price, price_rank, price_relative, is_clicked extracted
- [ ] Context features: city_id, device_type, platform, filter_count extracted
- [ ] Session features: session_length, action_count, click_count, last_action_type extracted
- [ ] Temporal features: hour, day_of_week, is_weekend extracted from timestamp
- [ ] Content features: star_rating, amenity_count, category from item_metadata
- [ ] Features cached to Parquet for fast reloading
- [ ] Feature group configuration file created
