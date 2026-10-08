# Recommendation in the application

The iOS Explore screen uses `GET /api/v1/recommendations` on the existing NestJS backend. It no longer calls the experimental Python ranking service or hashes hotel IDs into city IDs. The response explicitly reports `modelUsed: false`; this is content-based recommendation with transparent rules, not a trained probability model.

## Signals and ordering

Only published hotels are candidates. Prices are the minimum positive base price among active room types; these are current application catalog prices, not guaranteed date-specific availability. All matching candidates are ranked before the response limit is applied (20 by default, maximum 100). The current 100-property catalog remains small enough for this in-memory approach; larger catalogs need indexed candidate retrieval. Twenty original hotels have bookable room types; the other eighty listings are browse-only until verified room inventory is available.

For new visitors, a Bayesian rating with a five-review prior at 3.5/5 provides the base score. A city diversity penalty spreads the first recommendations across destinations. Name and ID provide deterministic tie breaks. No invented ratings are written to verified guest-review fields.

Hotelia-generated UI scores and 10–50 comments per hotel are stored separately from `averageRating`, `reviewCount`, and verified booking-based reviews. Explore attributes these scores and comments to Hotelia, and detail screens state that they are not guest reviews. They never feed recommendation quality, minimum guest-rating filters, or booking eligibility. The additional fifty browse-only hotel names and coordinates are attributed to [TripAdvisor Vietnam Hotel Reviews on Zenodo](https://zenodo.org/records/7967494) (CC BY 4.0); this historical dataset does not establish current inventory, pricing, imagery or property operation.

Personalization uses:

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

The original `B6_model.txt` has no learned splits, and the research service rejects it. The new `research/data/models/B6-candidates_model.txt` is trained on one candidate row per Trivago clickout impression. On 7,055 later labeled Trivago queries, its MRR@10 was 0.521 versus 0.389 for original impression order (100,000 action rows from the training file, with full item metadata). This is an offline result on another catalog, not evidence of better Hotelia bookings. The new model is not used by the app: Hotelia still needs matching inference features, valid bookable candidates, and enough actual served-row/detail-open/booking outcomes to evaluate its own users.

## Verification

- `npm --prefix backend test -- --runInBand recommendations`: 16 recommendation-service tests cover ranking behavior, identity, retry-safe served-row records, bounded candidates, and detail-open association.
- `research/venv/bin/python -m pytest research/tests -q` verifies candidate labels, past-only features, query grouping, baselines, evaluation and model training.
- Backend build and Hotelia iOS Simulator build passed.
- Local API against the real twenty-hotel database: initial five results span all five destinations; viewing HAIAN promotes HAIAN, Novotel Danang and Four Points. Repeated view remains one signal; a separate session stays unpersonalized; TP. Hồ Chí Minh returns four hotels; invalid session/token return 400/401.
- Temporary test-session history was deleted. No hotel, room or booking records were modified by these checks.
