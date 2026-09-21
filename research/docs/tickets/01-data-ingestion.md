# 01: Data Ingestion Pipeline

**What to build:** Data ingestion that loads 2GB CSV files into memory-efficient Parquet format with schema validation.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

## Acceptance Criteria

- [ ] CSV loader reads train.csv, test.csv, item_metadata.csv
- [ ] Schema validation checks columns: user_id, session_id, timestamp, step, action_type, reference, platform, city, device, current_filters, impressions, prices
- [ ] Data converted to Parquet for memory efficiency
- [ ] First 100K rows sample extracted for testing
- [ ] Data audit report generated (row counts, unique values, missing values)
- [ ] Lazy loading implemented for large files
