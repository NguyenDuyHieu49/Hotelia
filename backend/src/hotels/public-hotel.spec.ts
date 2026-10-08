import { Db } from 'mongodb';
import { bookingEnabledHotelIds, presentPublicHotel } from './public-hotel';

describe('public hotel booking state', () => {
  it('requires a published listing with a valid active room', async () => {
    const distinct = jest.fn().mockResolvedValue(['bookable', 'catalog-only']);
    const db = { collection: jest.fn().mockReturnValue({ distinct }) } as unknown as Db;
    const hotels = [
      { _id: 'bookable', status: 'PUBLISHED', isDemoCatalog: false },
      { _id: 'catalog-only', status: 'PUBLISHED', isDemoCatalog: true },
      { _id: 'draft', status: 'DRAFT', isDemoCatalog: false },
    ];

    const enabled = await bookingEnabledHotelIds(db, hotels);

    expect(distinct).toHaveBeenCalledWith('hotelId', {
      hotelId: { $in: ['bookable'] },
      isActive: true,
      totalRooms: { $gt: 0 },
      basePrice: { $gt: 0 },
      maxGuests: { $gte: 1 },
    });
    expect(presentPublicHotel(hotels[0], enabled).bookingEnabled).toBe(true);
    expect(presentPublicHotel(hotels[1], enabled).bookingEnabled).toBe(false);
    expect(presentPublicHotel(hotels[2], enabled).bookingEnabled).toBe(false);
  });

  it('keeps editorial scores separate from guest review fields', () => {
    const result = presentPublicHotel({
      _id: 'hotel', status: 'PUBLISHED', isDemoCatalog: true,
      demoRating: 4.9, demoReviewCount: 20, demoReviews: [{ rating: 5, contentVi: 'Minh họa' }],
      averageRating: 0, reviewCount: 0,
    }, new Set(['hotel']));

    expect(result).toEqual({
      _id: 'hotel', status: 'PUBLISHED', isDemoCatalog: true,
      averageRating: 0, reviewCount: 0, bookingEnabled: false,
      editorialRating: 4.9, editorialReviewCount: 20,
    });
    expect(presentPublicHotel({
      _id: 'hotel', status: 'PUBLISHED', isDemoCatalog: true,
      demoRating: 4.9, demoReviewCount: 20, demoReviews: [{ rating: 5, contentVi: 'Minh họa' }],
    }, new Set(), true).editorialReviews).toHaveLength(1);
  });
});
