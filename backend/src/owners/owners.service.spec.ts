import { Types } from 'mongoose';
import { OwnersService } from './owners.service';
import { BookingStatus } from '../bookings/schemas/booking.schema';

describe('owner booking list', () => {
  it('shows an expired hold as expired before returning reservations', async () => {
    const ownerId = new Types.ObjectId();
    const hotelId = new Types.ObjectId();
    const booking = { hotelId, status: BookingStatus.PENDING_PAYMENT, holdExpiresAt: new Date(Date.now() - 60_000) };
    const hotelModel = { find: jest.fn(async () => [{ _id: hotelId, ownerId }]) };
    const bookingModel = {
      updateMany: jest.fn(async (query: any, update: any) => {
        expect(query.hotelId.$in).toEqual([hotelId]);
        expect(query.status).toBe(BookingStatus.PENDING_PAYMENT);
        expect(query.$or[0].holdExpiresAt.$lte).toBeInstanceOf(Date);
        booking.status = update.$set.status;
      }),
      find: jest.fn(() => ({ sort: async () => [booking] })),
    };
    const service = new OwnersService({} as any, hotelModel as any, bookingModel as any, {} as any);
    const result = await service.getBookings(String(ownerId));
    expect(result[0].status).toBe(BookingStatus.EXPIRED);
    expect(bookingModel.updateMany).toHaveBeenCalledTimes(1);
  });
});
