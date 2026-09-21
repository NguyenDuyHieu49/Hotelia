# Hotelia - Booking App Specification

## 1. Domain Overview (from PDF Guide)

### 1.1 Core Business Domain
- **Booking by room type and number of nights** (not by physical room)
- **Stay interval**: [check-in, check-out) in local hotel timezone
- **Technical events stored in UTC**; business dates use clear date understanding, not +24h mechanical offset through timezone changes

### 1.2 Minimum App Features
1. Search destination/dates/guests
2. Hotel listing
3. Hotel detail
4. Create hold
5. Confirm with simulated payment
6. View booking status

---

## 2. Booking Lifecycle (Critical)

### 2.1 State Machine
```
[HELD] → [CONFIRMED/PAID] → [CHECKED_IN] → [CHECKED_OUT] → [COMPLETED]
    ↓            ↓
[CANCELLED]   [CANCELLED]
    ↓            ↓
[REFUNDED]    [REFUNDED]
```

### 2.2 State Definitions

| Status | Description | Can Cancel | Can Confirm |
|--------|------------|-----------|------------|
| HELD | Created, waiting for payment | ✅ | ✅ |
| PENDING_PAYMENT | Awaiting payment | ✅ | ✅ |
| PAID | Payment received | ❌ | ✅ |
| CONFIRMED | Confirmed booking | ✅ | ❌ |
| CHECKED_IN | Guest checked in | ❌ | ❌ |
| CHECKED_OUT | Guest checked out | ❌ | ❌ |
| COMPLETED | Stay finished | ❌ | ❌ |
| CANCELLED | Cancelled | ❌ | ❌ |
| REFUNDED | Money returned | ❌ | ❌ |
| EXPIRED | Hold expired | ❌ | ❌ |

### 2.3 Hold Expiry
- `holdExpiresAt` field stores server time
- Server decides if hold is valid at confirmation time
- Client countdown based on `expiresAt` from server, not local clock

---

## 3. Concurrency Control (Hướng 2)

### 3.1 Invariants (Must Always Hold)
```
For key k = (hotel, roomType, date):
  - Available ≥ 0
  - Booked ≥ 0
  - Held ≥ 0
  - Available + Booked + Held = Capacity
```

### 3.2 Idempotency Requirement
- Every request must have an idempotency key
- Same (actor, key) = same logical operation = same response
- Payload hash validation for conflict detection

### 3.3 Implementation Patterns

**Pattern C1 (Recommended for App):**
```
withTransaction:
  1. Check idempotency record
  2. For each night in stay:
     - Update: available >= quantity
     - Decrement: available -= quantity
  3. Create reservation with status HELD
  4. Insert outbox event
  5. Update idempotency record with response
```

### 3.4 Race Condition Tests
- T1: 1 room, 1 night, 100 concurrent requests → exactly 1 hold
- T2: Same actor/key → exactly 1 reservation
- T3: Same key, different payload → 409 conflict
- T4: 2 nights, first full → no partial allocation
- T5: Client timeout after commit → replay returns same reservation
- T6: Confirm and expire race → exactly 1 transition wins

---

## 4. Data Models

### 4.1 Inventory Collection
```javascript
{
  hotelId, roomTypeId, date,
  capacity, available,
  version  // For OCC if needed
}
// Unique index on (hotelId, roomTypeId, date)
```

### 4.2 Reservations Collection
```javascript
{
  actorId, roomTypeId,
  nights[],      // Array of dates
  quantity,
  status,        // HELD, CONFIRMED, CANCELLED, etc.
  holdExpiresAt,
  quoteSnapshot,
  paymentIntentId
}
// Index on (status, holdExpiresAt)
```

### 4.3 Idempotency Collection
```javascript
{
  actorId, key,
  payloadHash,
  reservationId,
  response,
  createdAt
}
// Unique index on (actorId, key)
```

---

## 5. API Endpoints

### 5.1 Booking Flow
```
POST /v1/holds          → Create hold (idempotency key required)
GET /v1/operations/{key} → Check operation status
GET /v1/reservations/{id} → Get reservation details
POST /v1/reservations/{id}/cancel → Cancel reservation
POST /v1/payment-events  → Payment webhook
```

### 5.2 Response Codes
- `201`: New hold created
- `200`: Replay (same reservation)
- `409`: Conflict (sold-out, payload mismatch, expired)
- `429/503`: Rate limited, retry with backoff

---

## 6. Error Handling

### 6.1 Retry Strategy
- Exponential backoff + jitter
- Maximum total retry time
- Store idempotency key BEFORE sending request

### 6.2 UI Behavior
- After timeout: Show "Checking result..." → poll status
- Do NOT auto-retry without user confirmation
- Countdown based on `expiresAt` from server
- If sold out: Reload quote, do NOT silently change hotel/dates

---

## 7. Recommendation System (Hướng 1) - Future

### 7.1 Features to Implement
- Content: amenities, star rating, location
- Context: city, device, filter
- Session: viewed items, preferences
- Historical: popularity by city, click rate

### 7.2 Baselines
- B0: Original impression order
- B1: Context popularity
- B2: Content + context matching
- B4: Session-kNN
- B6: LambdaMART (LightGBM)

---

## 8. Metrics (Hướng 2)

### 8.1 Success Metrics
- **Oversell units**: Max(0, Booked + Held - Capacity) = 0 ✅
- **Inventory mismatch**: Available + Booked + Held ≠ Capacity
- **Duplicate operations**: Same logical key → multiple side effects
- **Partial stay**: Reservation missing night allocation
- **Leaked hold**: Hold should be released but still counted

### 8.2 Performance Metrics
- Successful throughput: commits/second
- Latency p50/p95/p99
- Retry amplification: attempts / operations
- Offered load vs achieved load

---

## 9. Project Structure (Recommended)

```
DuLich/
├── app-ios/                    # Swift/SwiftUI
│   ├── Core/
│   │   ├── Explore/           # Search, listing, detail
│   │   ├── Booking/           # History, detail, cancel
│   │   ├── Profile/           # User profile
│   │   └── Services/          # API services
│   ├── Models/                # Data models
│   ├── Components/            # Reusable UI
│   └── App/                   # Entry point, theme
│
├── api/                        # Node.js backend
│   ├── routes/
│   ├── services/
│   ├── models/               # MongoDB schemas
│   └── middleware/
│
├── docs/
│   ├── SPEC.md               # This file
│   └── protocol.md           # Frozen before testing
│
└── research/                  # ML experiments (if Hướng 1)
    ├── data/
    ├── features/
    └── models/
```

---

## 10. Acceptance Criteria

### For Hướng 2 (Concurrency):
- [ ] State machine implemented
- [ ] Invariants hold under concurrent load
- [ ] Idempotency prevents duplicate bookings
- [ ] Hold expiry works correctly
- [ ] Race condition tests pass (T1-T10)
- [ ] Performance metrics measured

### For Hướng 1 (Recommendation):
- [ ] Dataset downloaded and audited
- [ ] Features implemented (content, context, session)
- [ ] Baselines B0-B6 compared
- [ ] Cold-start slices evaluated
- [ ] Model deployed to API

---

## References

Based on: **"Báo cáo định hướng và hướng dẫn triển khai Booking App"**
- Author: Haihướng chuyên sâu
- Date: 18/09/2026
