import { Types } from 'mongoose';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';

describe('booking creation under contention', () => {
  const hotelId = new Types.ObjectId();
  const roomTypeId = new Types.ObjectId();
  const firstUser = new Types.ObjectId();
  const secondUser = new Types.ObjectId();
  const dto: CreateBookingDto = {
    hotelId: String(hotelId), roomTypeId: String(roomTypeId),
    checkIn: '2026-10-10', checkOut: '2026-10-11', guestCount: 1,
    guestName: 'Demo Guest', guestEmail: 'guest@example.com', guestPhone: '0900000000',
  };

  function fixture() {
    const bookings: any[] = [];
    let queue = Promise.resolve();
    const bookingModel = {
      findOne: jest.fn((query: any) => {
        const value = bookings.find(b => String(b.userId) === String(query.userId) && b.requestKey === query.requestKey) ?? null;
        return { session: async () => value, then: (resolve: (value: any) => void) => Promise.resolve(value).then(resolve) };
      }),
      create: jest.fn(async ([value]: any[]) => {
        const booking = { ...value, _id: new Types.ObjectId() };
        bookings.push(booking);
        return [booking];
      }),
    };
    const db = { collection: jest.fn((name: string) => {
      if (name === 'hotels') return { findOne: async () => ({ _id: hotelId, status: 'PUBLISHED', name: 'Test Hotel' }) };
      if (name === 'roomtypes') return { findOneAndUpdate: async () =>
        ({ _id: roomTypeId, hotelId, isActive: true, maxGuests: 2, basePrice: 500000, totalRooms: 1, name: 'Deluxe' }) };
      if (name === 'bookings') return { find: () => ({ toArray: async () => bookings }) };
      if (name === 'notifications') return { insertOne: async () => ({ acknowledged: true }) };
      throw new Error(name);
    }) };
    const connection = {
      db,
      startSession: async () => ({
        withTransaction: async (work: () => Promise<void>) => {
          const turn = queue.then(work);
          queue = turn.catch(() => undefined);
          return turn;
        },
        endSession: async () => undefined,
      }),
    };
    const service = new BookingsService(bookingModel as any, {} as any, {} as any, connection as any);
    return { service, bookings, bookingModel };
  }

  it('allows only one of two customers to reserve the final room', async () => {
    const { service, bookings } = fixture();
    const results = await Promise.allSettled([
      service.create(String(firstUser), dto, 'bc88fe55-2ec1-48db-814f-e0d18529e001'),
      service.create(String(secondUser), dto, 'bc88fe55-2ec1-48db-814f-e0d18529e002'),
    ]);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(r => r.status === 'rejected')).toHaveLength(1);
    expect(bookings).toHaveLength(1);
    expect(bookings[0].totalPrice).toBe(500000);
  });

  it('returns the original booking on retry and rejects a changed payload', async () => {
    const { service, bookings, bookingModel } = fixture();
    const key = 'bc88fe55-2ec1-48db-814f-e0d18529e003';
    const created = await service.create(String(firstUser), dto, key);
    expect(await service.create(String(firstUser), dto, key)).toBe(created);
    await expect(service.create(String(firstUser), { ...dto, guestCount: 2 }, key)).rejects.toThrow('nội dung khác');
    expect(bookings).toHaveLength(1);
    expect(bookingModel.create).toHaveBeenCalledTimes(1);
  });
});
