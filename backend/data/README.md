# Real hotel catalog

`real-hotels.v1.json` maps the twenty existing demo hotel IDs to real properties, four per destination. Each entry includes official source URLs; facts were checked on 2026-09-25 (Vietnam time). Descriptions are original Vietnamese summaries. City names remain app destination labels, not administrative classifications.

The migration was applied to the configured MongoDB database `test`: 20 matched, 20 modified, 20 confirmed. IDs, owners, status, 60 room types and one booking were preserved. There were no associated reviews, so synthetic average ratings and review counts became zero. Transaction checks compared the complete associated room, availability, booking and review documents before committing.

## Coverage and limitations

- All 20: real name, address, short description, official sources; amenities list contains confirmed facilities only.
- 19: star category verified from official hotel/brand or tourism sources. InterContinental Phu Quoc uses `starRating: 0` (unknown), rather than an inferred category.
- Media follow-up: all 20 hotel images and all 60 room images now use verified official photos, cached as JPEG under `backend/public/media/hotels`. Source pages, original URLs, exact room/gallery names, dimensions and SHA-256 hashes are recorded in `verified-media.v1.json`. LOTTE names are the official gallery groups Standard, Club Floor and Suite, not a more specific inventory category.
- 4: coordinates published by Accor. Other coordinates and all synthetic districts were removed.
- 8: check-in/out verified. Other existing policy times remain demo values and are marked unknown in each document's `dataProvenance`.
- Room names/photos now follow official sources; prices, capacity, room amenities, stock, ownership and the preserved booking remain application/demo data, not live availability or affiliation with the real hotels. No third-party guest ratings were imported. The app displays “Chưa có đánh giá” for zero-review hotels.

## Operation

From the repository root:

```sh
node backend/scripts/update-real-hotels.cjs
node backend/scripts/update-real-hotels.cjs --apply
```

The default is read-only. Applying checks fixed IDs, expected synthetic names, destination and database, writes a private BSON Extended JSON backup, then uses a MongoDB transaction with majority write concern. It aborts on mismatches or unexpected concurrent changes. A repeat against the applied version exits without rewriting records.

Do not run `seed.js` or `seed_full.js` to apply this catalog: those seed scripts delete existing data and can recreate synthetic hotels.

The follow-up media migration has the same dry-run default:

```sh
node backend/scripts/update-hotel-media.cjs
node backend/scripts/update-hotel-media.cjs --apply
node backend/scripts/verify-hotel-media.cjs
```

It verifies all local file hashes, takes a private backup of the 20 hotels and 60 rooms, and uses a transaction to update only images, room names/descriptions and provenance. It checks preserved fields and related bookings/reviews/availability before committing. Re-running the applied version does not overwrite records. Deploy `public/media` alongside `dist` to serve `/media/` successfully.

Local backups and the application result are in ignored `backend/backups/`; snapshots include owner identifiers and must stay private. The backup is BSON Extended JSON, preserving ObjectIds and dates. To recover, parse with BSON EJSON, compare current records to the applied catalog first, and restore only the affected catalog fields by ID inside a transaction. Do not blindly replace whole documents after subsequent user edits.
