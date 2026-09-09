import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Hotel, HotelDocument, HotelStatus } from '../hotels/schemas/hotel.schema';
import { Booking, BookingDocument, BookingStatus } from '../bookings/schemas/booking.schema';

@Injectable()
export class OwnersService {
  constructor(
    @InjectModel(Hotel.name) private hotelModel: Model<HotelDocument>,
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
  ) {}

  async getDashboard(ownerId: string) {
    const hotels = await this.hotelModel.find({ ownerId: new Types.ObjectId(ownerId) });
    const hotelIds = hotels.map(h => h._id);

    const [publishedHotels, pendingHotels, bookings, revenueData] = await Promise.all([
      this.hotelModel.countDocuments({ ownerId: new Types.ObjectId(ownerId), status: HotelStatus.PUBLISHED }),
      this.hotelModel.countDocuments({ ownerId: new Types.ObjectId(ownerId), status: HotelStatus.PENDING_APPROVAL }),
      this.bookingModel.countDocuments({ hotelId: { $in: hotelIds } }),
      this.bookingModel.aggregate([
        { $match: { hotelId: { $in: hotelIds }, status: { $in: [BookingStatus.PAID, BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN, BookingStatus.CHECKED_OUT, BookingStatus.COMPLETED] } } },
        { $group: { _id: null, totalRevenue: { $sum: '$totalPrice' }, count: { $sum: 1 } } },
      ]),
    ]);

    const totalRevenue = revenueData[0]?.totalRevenue || 0;

    return {
      stats: {
        totalHotels: hotels.length,
        publishedHotels,
        pendingHotels,
        totalBookings: bookings,
        totalRevenue,
      },
      hotels: hotels.map(h => ({
        id: h._id,
        name: h.name,
        city: h.city,
        status: h.status,
        rating: h.averageRating,
        reviewCount: h.reviewCount,
      })),
    };
  }

  async getHotelBookings(ownerId: string, hotelId: string) {
    const hotel = await this.hotelModel.findOne({
      _id: new Types.ObjectId(hotelId),
      ownerId: new Types.ObjectId(ownerId),
    });
    if (!hotel) throw new Error('Hotel not found');

    return this.bookingModel.find({ hotelId: new Types.ObjectId(hotelId) })
      .populate('userId', 'name email phone')
      .sort({ checkIn: -1 });
  }

  async getRevenueByMonth(ownerId: string, year: number) {
    const hotels = await this.hotelModel.find({ ownerId: new Types.ObjectId(ownerId) });
    const hotelIds = hotels.map(h => h._id);

    return this.bookingModel.aggregate([
      {
        $match: {
          hotelId: { $in: hotelIds },
          status: { $in: [BookingStatus.PAID, BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN, BookingStatus.CHECKED_OUT, BookingStatus.COMPLETED] },
          createdAt: { $gte: new Date(`${year}-01-01`), $lte: new Date(`${year}-12-31`) },
        },
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          revenue: { $sum: '$totalPrice' },
          bookings: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  }
}
