# Explore demo catalog

`backend/data/explore-hotels.v1.json` lists 30 additional real hotel names and destinations, with links to their operator or property sources. `backend/scripts/expand-explore-catalog.cjs` checks the existing 20 verified catalog records, previews its plan by default, and applies scoped, idempotent upserts with `--apply`. It saves a local EJSON backup before applying changes. It never deletes hotels, rooms, bookings, or reviews.

The new records are `isDemoCatalog: true`: they appear in Explore but have no room types, rate, inventory, or verified property photo. The app uses a labeled destination illustration and disables booking for them. Date, party-size, and price filters continue to select only listings with eligible rooms. The existing 20 bookable hotels remain the recommendation set.

`demoRating`, `demoReviewCount`, and `demoReviews` are explicitly illustrative. They are separate from `averageRating`, `reviewCount`, and the verified `reviews` collection. The Explore ranking and sample comments label these values as demo data in Vietnamese and English. Replace them with real post-stay reviews when available; do not copy sample values into verified guest-review fields.

Run from `backend/`:

```sh
node scripts/expand-explore-catalog.cjs
node scripts/expand-explore-catalog.cjs --apply
```
