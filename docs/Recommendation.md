# Recommendation in the application

The iOS Explore screen uses `GET /api/v1/recommendations` on the existing NestJS backend. NestJS loads the Hotelia LightGBM tree artifact in-process, so deployment does not require a second Python service. Successful learned ranking reports `modelUsed: true` and version `hotelia-lgbm-2026-10-23-v1`. A load or scoring error automatically falls back to the content ranker and reports `modelUsed: false`.

## Signals and ordering

Only published hotels are candidates. Prices are the minimum positive base price among active room types; these are current application catalog prices, not guaranteed date-specific availability. All matching candidates are ranked before the response limit is applied (20 by default, maximum 100). All 100 properties have an owner, four active room types, positive rates, capacity and inventory. The current catalog remains small enough for this in-memory approach; larger catalogs need indexed candidate retrieval.

The model uses catalog price, relative price, star category, rating, review volume, amenity count, a Bayesian quality prior, history-derived city/price/star/amenity affinity, history volume and request time. For new visitors, history features are zero and catalog quality, price and amenities drive discovery. Name and ID provide deterministic tie breaks.

Hotelia catalog scores and 10–50 comments per hotel remain separate from `averageRating`, `reviewCount`, and verified booking-based reviews. When no verified guest rating exists, the catalog score can contribute a content-quality feature and minimum-rating discovery filter, while API responses continue to expose it as `editorialRating` rather than a verified guest aggregate. The additional fifty hotel names and coordinates are attributed to [TripAdvisor Vietnam Hotel Reviews on Zenodo](https://zenodo.org/records/7967494) (CC BY 4.0). Generated rates, room inventory and managed owner records retain internal provenance and await confirmation from each property.

The content fallback uses:

- One most-recent view per actor and hotel from the last 90 days, with a 14-day half-life. Reopening the same hotel refreshes recency, not frequency.
- Distinct hotels in the authenticated user's paid/confirmed/check-in/check-out/completed bookings created within 90 days, weighted three times a fresh view. Cancelled, expired and refunded bookings are excluded.
- Similarity: same destination (40%), amenity Jaccard overlap (25%), ratio of minimum room prices (20%), and star-category proximity (15%). Unknown prices/stars contribute no similarity.
- Final relevance: 70% weighted similarity plus 30% Bayesian quality. A small diversity penalty avoids overwhelming the list with one destination. Cold-start city penalty is larger.

Destination aliases and diacritics are normalized. The active destination remains a hard filter, even when history favors another city. Price, amenities and category are inferred preferences from viewed/booked hotels; no explicit budget or preference form is implemented.

## Identity and retention

`sessionId` must be a UUID. Without a token, history belongs only to that anonymous session. With a token, the JWT guard validates the account and history belongs to `user:<sub>`; request bodies cannot select another account. Invalid tokens are rejected rather than silently treated as anonymous. Guest history is not merged into an account on login. Anonymous iOS history lasts for the current app process; authenticated history is shared across the user's sessions.

`POST /recommendations/views` accepts `sessionId` and a published `hotelId`. Opening hotel detail records a view; failure never blocks the detail screen. A deterministic document ID deduplicates retries. `recommendation_views` has an actor/recency index and a 90-day TTL index. Queries also enforce the retention window while MongoDB's TTL cleanup runs asynchronously.

When the Explore recommendation row loads, the app sends `POST /recommendations/impressions` with an idempotent UUID and the ordered IDs of up to eight bookable cards in that row. The backend validates published hotel IDs, stores their one-based positions, the time, supported destination key, and active date/guest/price/rating filters for at most 90 days. Arbitrary search text, IP address and device identifiers are not stored in this collection. The stored `eventType` is `recommendation_served`, `reportOrigin` is `client_reported`, and `cardVisibility` is `unverified`: it records an opportunity to see each card, **not proof that every card entered the viewport**. An opened detail is a separate event, linked only if the hotel was in that actor's recorded candidate list. Repeated posts cannot inflate or reorder the record. Neither event proves a booking or a click-out to another website.

`DELETE /recommendations/views?sessionId=<UUID>` removes the caller's view history and recommendation-row telemetry. Existing bookings are not deleted by this endpoint and still contribute preferences. No bulk tracking or raw third-party IDs are imported.

## App behavior

Explore loads recommendations on appearing and on pull-to-refresh, retaining the current destination. A request generation counter prevents a slow old search overwriting a newer destination. Backend failure falls back to the ordinary hotel list with an explicit nonpersonalized label. Visible text describes actual ranking instead of claiming AI. No separate port-8000 process is required.

The Trivago `B6-candidates_model.txt` remains a separate research benchmark because its item IDs do not map to Hotelia. The active Hotelia artifact is trained on 8,000 deterministic pre-release queries over the 100-property catalog with exact backend feature parity. Its held-out MRR@10 is 0.620 versus 0.342 for the catalog-quality baseline. This validates the training, export and TypeScript scoring path; it is not a production-quality claim. Once enough consented impression, detail-open and confirmed-booking outcomes exist, retrain with those labels and compare against the fallback in an online experiment.

## Verification

- `npm --prefix backend test -- --runInBand lightgbm-ranker.spec.ts recommendations.spec.ts ranking.spec.ts`: 18 tests cover Python/TypeScript prediction parity, learned ranking, fallback behavior, identity, retry-safe served-row records, bounded candidates, and detail-open association.
- `research/venv/bin/python -m pytest research/tests -q` verifies candidate labels, past-only features, query grouping, baselines, evaluation and model training.
- Backend build and Hotelia iOS Simulator build passed.
- The operational catalog migration verifies 80 generated owners, 320 active room types, a 700,000–3,500,000 VND rate range and 100 bookable hotels in one MongoDB transaction.
