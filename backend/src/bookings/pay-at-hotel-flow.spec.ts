import { Types } from 'mongoose';
import { BookingsService } from './bookings.service';
import { BookingStateService } from './booking-state.service';
import { BookingStatus } from './schemas/booking.schema';
import { CreateBookingDto } from './dto/create-booking.dto';

type RecordValue = Record<string, any>;

// Stateful persistence fixture: every service call reads the changes made by previous calls.
function matches(row: RecordValue, query: RecordValue): boolean {
  return Object.entries(query).every(([field, expected]) => {
    if (field === '$or') return (expected as RecordValue[]).some(part => matches(row, part));
    const actual = row[field];
    if (expected && typeof expected === 'object' && !(expected instanceof Date) && !(expected instanceof Types.ObjectId)) {
      const operators = expected as RecordValue;
      if ('$in' in operators) return operators.$in.some((value: unknown) => String(actual) === String(value));
      if ('$exists' in operators) {
        if ((actual !== undefined) !== operators.$exists) return false;
        return Object.entries(operators).every(([op, value]) => op === '$exists' || compare(actual, op, value));
      }
      return Object.entries(operators).every(([op, value]) => compare(actual, op, value));
    }
    return String(actual) === String(expected);
  });
}

function compare(actual: unknown, op: string, value: unknown): boolean {
  const left = actual instanceof Date ? +actual : actual as number;
  const right = value instanceof Date ? +value : value as number;
  if (op === '$gt') return left > right;
  if (op === '$gte') return left >= right;
  if (op === '$lt') return left < right;
  if (op === '$lte') return left <= right;
  throw new Error(`Unsupported query operator ${op}`);
}

describe('pay-at-hotel booking journey', () => {
  const hotelId = new Types.ObjectId();
  const roomTypeId = new Types.ObjectId();
  const ownerId = new Types.ObjectId();
  const guestA = new Types.ObjectId();
  const guestB = new Types.ObjectId();
  const checkIn = '2026-10-20';
  const dto: CreateBookingDto = {
    hotelId: String(hotelId), roomTypeId: String(roomTypeId), checkIn, checkOut: '2026-10-22',
    guestCount: 2, guestName: 'Test Guest', guestEmail: 'guest@example.com', guestPhone: '0900000000',
  };

  beforeEach(() => jest.useFakeTimers().setSystemTime(new Date('2026-10-06T03:00:00Z')));
  afterEach(() => jest.useRealTimers());

  function fixture() {
    const bookings: RecordValue[] = [];
    const hotel = { _id: hotelId, ownerId, status: 'PUBLISHED', name: 'Hotelia Test' };
    const bookingModel = {
      findOne: jest.fn((query: RecordValue) => {
        const value = bookings.find(row => matches(row, query)) ?? null;
        return { session: async () => value, then: (resolve: (value: unknown) => void) => Promise.resolve(value).then(resolve) };
      }),
      findById: jest.fn(async (id: string) => bookings.find(row => String(row._id) === String(id)) ?? null),
      create: jest.fn(async ([value]: RecordValue[]) => {
        const booking = { ...value, _id: new Types.ObjectId(), createdAt: new Date() };
        bookings.push(booking);
        return [booking];
      }),
      updateOne: jest.fn(async (query: RecordValue, update: RecordValue) => {
        const row = bookings.find(value => matches(value, query));
        if (row) Object.assign(row, update.$set);
        return { modifiedCount: row ? 1 : 0 };
      }),
      updateMany: jest.fn(async (query: RecordValue, update: RecordValue) => {
        const rows = bookings.filter(value => matches(value, query));
        rows.forEach(row => Object.assign(row, update.$set));
        return { modifiedCount: rows.length };
      }),
      findOneAndUpdate: jest.fn(async (query: RecordValue, update: RecordValue) => {
        const row = bookings.find(value => matches(value, query));
        if (row) Object.assign(row, update.$set);
        return row ?? null;
      }),
    };
    const collection = jest.fn((name: string) => {
      if (name === 'hotels') return { findOne: async () => hotel };
      if (name === 'roomtypes') return { findOneAndUpdate: async () =>
        ({ _id: roomTypeId, hotelId, isActive: true, maxGuests: 2, basePrice: 500000, totalRooms: 1, name: 'Deluxe' }) };
      if (name === 'bookings') return { find: (query: RecordValue) => ({ toArray: async () => bookings.filter(row => matches(row, query)) }) };
      if (name === 'notifications') return { insertOne: async () => ({ acknowledged: true }) };
      if (name === 'payments') return { findOne: async () => null };
      throw new Error(name);
    });
    const connection = { db: { collection }, startSession: async () => ({
      withTransaction: async (work: () => Promise<void>) => work(), endSession: async () => undefined,
    }) };
    const hotelsService = { findById: async () => hotel };
    const service = new BookingsService(bookingModel as any, new BookingStateService(), hotelsService as any, connection as any);
    return { service, bookings, bookingModel };
  }

  it('holds a room, survives retries, confirms pay-at-hotel, and lets the owner check in and out', async () => {
    const { service, bookings } = fixture();
    const key = 'bc88fe55-2ec1-48db-814f-e0d18529e011';
    const held = await service.create(String(guestA), dto, key);
    expect(held.status).toBe(BookingStatus.PENDING_PAYMENT);
    expect(held.totalPrice).toBe(1_000_000);
    expect(+held.holdExpiresAt!).toBe(Date.now() + 15 * 60_000);
    expect(await service.create(String(guestA), dto, key)).toBe(held);
    await expect(service.create(String(guestA), { ...dto, guestCount: 1 }, key)).rejects.toThrow('nội dung khác');
    expect(bookings).toHaveLength(1);

    const confirmed = await service.confirmPayAtHotel(String(held._id), String(guestA));
    expect(confirmed.status).toBe(BookingStatus.CONFIRMED);
    expect(confirmed.paymentMethod).toBe('PAY_AT_HOTEL');
    expect(await service.confirmPayAtHotel(String(held._id), String(guestA))).toBe(confirmed);
    await expect(service.checkIn(String(held._id), String(guestB))).rejects.toThrow('Not your hotel');
    await expect(service.checkIn(String(held._id), String(ownerId))).rejects.toThrow('Chưa đến ngày');

    jest.setSystemTime(new Date('2026-10-20T03:00:00Z'));
    const checkedIn = await service.checkIn(String(held._id), String(ownerId));
    expect(checkedIn.checkedInAt).toEqual(new Date());
    expect(await service.checkIn(String(held._id), String(ownerId))).toBe(checkedIn);
    await expect(service.cancel(String(held._id), String(guestA), {})).rejects.toThrow('Cannot cancel');
    const checkedOut = await service.checkOut(String(held._id), String(ownerId));
    expect(checkedOut.status).toBe(BookingStatus.CHECKED_OUT);
    expect(checkedOut.checkedOutAt).toEqual(new Date());
    expect(await service.checkOut(String(held._id), String(ownerId))).toBe(checkedOut);
    await expect(service.create(String(guestB), dto, 'bc88fe55-2ec1-48db-814f-e0d18529e012'))
      .rejects.toThrow('đã hết');
  });

  it('expires an unconfirmed hold and keeps cancellation requests occupied until owner approval', async () => {
    const { service, bookings } = fixture();
    const first = await service.create(String(guestA), dto, 'bc88fe55-2ec1-48db-814f-e0d18529e013');
    jest.advanceTimersByTime(16 * 60_000);
    expect((await service.create(String(guestA), dto, 'bc88fe55-2ec1-48db-814f-e0d18529e013')).status)
      .toBe(BookingStatus.EXPIRED);
    await expect(service.confirmPayAtHotel(String(first._id), String(guestA))).rejects.toThrow('không còn chờ');

    const second = await service.create(String(guestB), dto, 'bc88fe55-2ec1-48db-814f-e0d18529e014');
    expect((await service.cancel(String(second._id), String(guestB), {})).status).toBe(BookingStatus.CANCELLED);
    expect((await service.cancel(String(second._id), String(guestB), {})).status).toBe(BookingStatus.CANCELLED);

    const third = await service.create(String(guestA), dto, 'bc88fe55-2ec1-48db-814f-e0d18529e015');
    await service.confirmPayAtHotel(String(third._id), String(guestA));
    expect((await service.cancel(String(third._id), String(guestA), {})).status).toBe(BookingStatus.CANCEL_REQUESTED);
    expect((await service.cancel(String(third._id), String(guestA), {})).status).toBe(BookingStatus.CANCEL_REQUESTED);
    await expect(service.create(String(guestB), dto, 'bc88fe55-2ec1-48db-814f-e0d18529e016'))
      .rejects.toThrow('đã hết');
    await expect(service.resolveCancellation(String(third._id), String(guestB), 'OWNER'))
      .rejects.toThrow('Not your booking');
    expect((await service.resolveCancellation(String(third._id), String(ownerId), 'OWNER')).status)
      .toBe(BookingStatus.CANCELLED);
    expect((await service.resolveCancellation(String(third._id), String(ownerId), 'OWNER')).status)
      .toBe(BookingStatus.CANCELLED);
    expect((await service.create(String(guestB), dto, 'bc88fe55-2ec1-48db-814f-e0d18529e017')).status)
      .toBe(BookingStatus.PENDING_PAYMENT);
    expect(bookings).toHaveLength(4);
  });
});
