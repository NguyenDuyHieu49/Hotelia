# Protocol - Booking Concurrency Control

**Status**: DRAFT - Update before final testing

---

## 1. Concurrency Mechanisms

### C1: Conditional Update + Transaction (Recommended)
MongoDB transaction với conditional atomic update

### C2: Version-based OCC
Đọc version, kiểm tra trong transaction

### C3: Redis Lease + C1
Lease để giới hạn tranh chấp

---

## 2. Workload Design

### W1: Distributed
- 1,000 inventory keys
- Uniform selection
- Sufficient capacity

### W2: Hot Spot
- 90% requests → single room type
- 10% distributed

### W3: Multiple Nights
- 1/3/7 night stays
- Overlapping periods

### W4: Full Lifecycle
- 60% hold → confirm
- 20% cancel
- 20% expire

### W5: Errors
- 10% retry duplicate
- Pause/crash at fixed points

---

## 3. Test Scenarios

### T1: Basic Race
- 1 room, 1 night, 100 concurrent requests
- **Expected**: Exactly 1 hold created

### T2: Idempotency
- Same actor/key/payload × 100
- **Expected**: Exactly 1 reservation

### T3: Payload Conflict
- Same key, different payload dates
- **Expected**: 1 accepted, others 409

### T4: Partial Allocation
- 2 nights: first full, second sold out
- **Expected**: No partial allocation

### T5: Timeout After Commit
- Client timeout after DB commit
- **Expected**: Replay returns same reservation

### T6: Confirm vs Expire Race
- **Expected**: Exactly 1 transition wins

### T7: Worker Crash
- Release before/after commit
- **Expected**: No leak, no double count

### T8: Payment Duplicate
- **Expected**: No double decrement

### T9: Lease TTL Expiry
- **Expected**: C1 still maintains invariant

### T10: Overlapping Stays
- **Expected**: All nights correct

---

## 4. Metrics

| Metric | Target |
|--------|--------|
| Oversell units | 0 |
| Duplicate operations | 0 |
| Partial stay | 0 |
| Leaked hold | 0 |
| p95 latency | < 500ms |
| Error rate | < 1% |

---

## 5. Test Environment

- MongoDB Replica Set (single node OK for dev)
- Node.js API instances
- k6 for load testing
- Seed: [TO BE SET]
- Date: [TO BE SET]

---

## 6. Results

### C0 (Naive Read-Check-Write)
| Metric | Value |
|--------|-------|
| Oversell | [TO MEASURE] |
| Throughput | [TO MEASURE] |
| p95 | [TO MEASURE] |

### C1 (Conditional Update)
| Metric | Value |
|--------|-------|
| Oversell | [TO MEASURE] |
| Throughput | [TO MEASURE] |
| p95 | [TO MEASURE] |

### C2 (Version OCC)
| Metric | Value |
|--------|-------|
| Oversell | [TO MEASURE] |
| Throughput | [TO MEASURE] |
| p95 | [TO MEASURE] |

---

**Note**: Fill in results AFTER running experiments. Do NOT fill in fake numbers.
