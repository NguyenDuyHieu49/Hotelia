# Recommendation in the application

The iOS Explore screen uses `GET /api/v1/recommendations` on the existing NestJS backend. It no longer calls the experimental Python ranking service or hashes hotel IDs into city IDs. The response explicitly reports `modelUsed: false`; this is content-based recommendation with transparent rules, not a trained probability model.

## Signals and ordering

Only published hotels are candidates. Prices are the minimum positive base price among active room types; these are current application catalog prices, not guaranteed date-specific availability. All matching candidates are ranked before the response limit is applied (20 by default, maximum 100). This in-memory approach is appropriate for the current twenty-property catalog; larger catalogs need indexed candidate retrieval.

For new visitors, a Bayesian rating with a five-review prior at 3.5/5 provides the base score. A city diversity penalty spreads the first recommendations across destinations. Name and ID provide deterministic tie breaks. No invented ratings are written to the database.

Personalization uses:

- One most-recent view per actor and hotel from the last 90 days, with a 14-day half-life. Reopening the same hotel refreshes recency, not frequency.
- Distinct hotels in the authenticated user's paid/confirmed/check-in/check-out/completed bookings created within 90 days, weighted three times a fresh view. Cancelled, expired and refunded bookings are excluded.
- Similarity: same destination (40%), amenity Jaccard overlap (25%), ratio of minimum room prices (20%), and star-category proximity (15%). Unknown prices/stars contribute no similarity.
- Final relevance: 70% weighted similarity plus 30% Bayesian quality. A small diversity penalty avoids overwhelming the list with one destination. Cold-start city penalty is larger.

Destination aliases and diacritics are normalized. The active destination remains a hard filter, even when history favors another city. Price, amenities and category are inferred preferences from viewed/booked hotels; no explicit budget or preference form is implemented.

## Identity and retention

`sessionId` must be a UUID. Without a token, history belongs only to that anonymous session. With a token, the JWT guard validates the account and history belongs to `user:<sub>`; request bodies cannot select another account. Invalid tokens are rejected rather than silently treated as anonymous. Guest history is not merged into an account on login. Anonymous iOS history lasts for the current app process; authenticated history is shared across the user's sessions.

`POST /recommendations/views` accepts `sessionId` and a published `hotelId`. Opening hotel detail records a view; failure never blocks the detail screen. A deterministic document ID deduplicates retries. `recommendation_views` has an actor/recency index and a 90-day TTL index. Queries also enforce the retention window while MongoDB's TTL cleanup runs asynchronously.

`DELETE /recommendations/views?sessionId=<UUID>` removes only the caller's view history. Existing bookings are not deleted by this endpoint and still contribute preferences. No bulk tracking or raw third-party IDs are imported.

## App behavior

Explore loads recommendations on appearing and on pull-to-refresh, retaining the current destination. A request generation counter prevents a slow old search overwriting a newer destination. Backend failure falls back to the ordinary hotel list with an explicit nonpersonalized label. Visible text describes actual ranking instead of claiming AI. No separate port-8000 process is required.

The previously saved LightGBM model has no learned splits. The research service now rejects constant models and marks fallback explicitly. It remains experimental and is not used by the app. A trustworthy learned ranker needs impression-level candidate features, outcomes from real sessions, temporal holdout evaluation and comparison to this baseline; there is currently no evidence to claim an improvement in click-through or booking rate. Viewing a few hotels verifies functional behavior, not model accuracy.

## Verification

- `npm --prefix backend test -- --runInBand recommendations`: 10 tests cover cold start, relevance, diversity, rating prior, missing data, account/session scoping, booking status selection, destination constraints, deduplication and rank-before-limit.
- Backend build and Hotelia iOS Simulator build passed.
- Local API against the real twenty-hotel database: initial five results span all five destinations; viewing HAIAN promotes HAIAN, Novotel Danang and Four Points. Repeated view remains one signal; a separate session stays unpersonalized; TP. Hồ Chí Minh returns four hotels; invalid session/token return 400/401.
- Temporary test-session history was deleted. No hotel, room or booking records were modified by these checks.
