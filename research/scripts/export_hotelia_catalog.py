"""Snapshot the catalog that Hotelia's recommendation API ranks.

The trainer reads this file instead of inventing prices or ratings, so each
hotel's model inputs match what NestJS computes at request time. The public
recommendations endpoint is read-only and already returns every published
hotel with its minimum bookable room price.

Rating and review count follow `RecommendationsService.recommend`: verified
reviews win; otherwise the editorial (demo) values are used; otherwise zero.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

DEFAULT_API = "https://api.hotelia.asia/api/v1"


def serving_values(hotel: dict) -> dict:
    reviews = hotel.get("reviewCount") or 0
    verified = isinstance(reviews, (int, float)) and reviews > 0
    rating = hotel.get("averageRating") if verified else hotel.get("editorialRating")
    count = reviews if verified else hotel.get("editorialReviewCount")
    price = hotel.get("minPrice")
    return {
        "id": str(hotel["_id"]),
        "name": hotel["name"],
        "city": hotel["city"],
        "stars": int(hotel.get("starRating") or 0),
        "price": float(price) if isinstance(price, (int, float)) and price > 0 else None,
        "rating": float(rating or 0),
        "reviews": int(count or 0),
        "amenities": sorted(hotel.get("amenities") or []),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--api", default=DEFAULT_API)
    parser.add_argument("--output", default=str(Path(__file__).resolve().parents[1] / "data/hotelia-catalog-snapshot.json"))
    args = parser.parse_args()
    query = urlencode({"sessionId": str(uuid.uuid4()), "limit": 100})
    request = Request(f"{args.api.rstrip('/')}/recommendations?{query}", headers={"Accept": "application/json"})
    with urlopen(request, timeout=90) as response:
        body = json.load(response)
    hotels = sorted((serving_values(hotel) for hotel in body["hotels"]), key=lambda hotel: hotel["id"])
    if body.get("total") != len(hotels):
        raise ValueError(f"API listed {body.get('total')} hotels but returned {len(hotels)}; raise the limit")
    if len({hotel["id"] for hotel in hotels}) != len(hotels):
        raise ValueError("Duplicate hotel IDs in snapshot")
    canonical = json.dumps(hotels, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    snapshot = {
        "source": f"{args.api.rstrip('/')}/recommendations",
        "fetchedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "sha256": hashlib.sha256(canonical.encode()).hexdigest(),
        "hotels": hotels,
    }
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(snapshot, ensure_ascii=False, indent=1) + "\n")
    print(f"{len(hotels)} hotels -> {output} (sha256 {snapshot['sha256'][:12]})")


if __name__ == "__main__":
    main()
