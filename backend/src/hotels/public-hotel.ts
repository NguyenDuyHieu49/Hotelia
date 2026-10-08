import { Db } from 'mongodb';

type Listing = {
  _id: unknown;
  status?: string;
  isDemoCatalog?: boolean;
  demoRating?: unknown;
  demoReviewCount?: unknown;
  demoReviews?: unknown;
};

export async function bookingEnabledHotelIds(db: Db, hotels: Listing[]): Promise<Set<string>> {
  const eligible = hotels.filter(hotel => hotel.status === 'PUBLISHED' && !hotel.isDemoCatalog);
  if (!eligible.length) return new Set();
  const ids = await db.collection('roomtypes').distinct('hotelId', {
    hotelId: { $in: eligible.map(hotel => hotel._id) },
    isActive: true,
    totalRooms: { $gt: 0 },
    basePrice: { $gt: 0 },
    maxGuests: { $gte: 1 },
  });
  return new Set(ids.map(String));
}

export function presentPublicHotel<T extends Listing>(hotel: T, enabledIds: Set<string>, includeEditorialReviews = false) {
  const { demoRating, demoReviewCount, demoReviews, ...listing } = hotel;
  const count = typeof demoReviewCount === 'number' && demoReviewCount >= 10 && demoReviewCount <= 50
    ? demoReviewCount : 0;
  const rating = typeof demoRating === 'number' && Number.isFinite(demoRating) && demoRating >= 1 && demoRating <= 5
    ? demoRating : undefined;
  return {
    ...listing,
    _id: hotel._id,
    bookingEnabled: hotel.status === 'PUBLISHED' && !hotel.isDemoCatalog && enabledIds.has(String(hotel._id)),
    ...(rating !== undefined && count ? { editorialRating: rating, editorialReviewCount: count } : {}),
    ...(includeEditorialReviews && Array.isArray(demoReviews) ? { editorialReviews: demoReviews } : {}),
  };
}
