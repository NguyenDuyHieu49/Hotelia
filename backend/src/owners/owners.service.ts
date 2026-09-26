import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { Hotel, HotelDocument, HotelStatus } from '../hotels/schemas/hotel.schema';
import { Booking, BookingDocument, BookingStatus } from '../bookings/schemas/booking.schema';
import { User, UserDocument, OwnerStatus, UserRole } from '../users/schemas/user.schema';

@Injectable()
export class OwnersService {
  constructor(
    @InjectConnection() private connection:Connection,
    @InjectModel(Hotel.name) private hotelModel: Model<HotelDocument>,
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async apply(userId: string, businessName: string, businessLicense?: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new Error('User not found');

    if(user.role!==UserRole.USER || user.ownerStatus===OwnerStatus.PENDING) throw new BadRequestException('Không thể gửi lại yêu cầu hiện tại');
    user.businessName = businessName;
    user.businessLicense = businessLicense;
    user.ownerStatus = OwnerStatus.PENDING;
    await user.save();

    return { message: 'Application submitted successfully', status: OwnerStatus.PENDING };
  }

  async getBookings(ownerId:string) {
    const hotels=await this.hotelModel.find({ownerId:new Types.ObjectId(ownerId)});
    return this.bookingModel.find({hotelId:{$in:hotels.map(h=>h._id)}}).sort({createdAt:-1});
  }

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
    const reservations=await this.bookingModel.find({hotelId:{$in:hotelIds},status:{$in:['PAID','CONFIRMED','CHECKED_IN','CHECKED_OUT','COMPLETED']}}).lean();
    const today=new Date(Date.now()+7*3600000).toISOString().slice(0,10);
    const createdDay=(b:any)=>new Date(+new Date(b.createdAt)+7*3600000).toISOString().slice(0,10);
    const todayRevenue=reservations.filter(b=>createdDay(b)===today).reduce((a,b)=>a+b.totalPrice,0);
    const monthRevenue=reservations.filter(b=>createdDay(b).slice(0,7)===today.slice(0,7)).reduce((a,b)=>a+b.totalPrice,0);
    const rooms=await this.connection.db!.collection('roomtypes').find({hotelId:{$in:hotelIds},isActive:true}).toArray();
    const capacity=rooms.reduce((a,r)=>a+r.totalRooms,0);
    const occupied=reservations.filter(b=>b.status==='CHECKED_IN').length;
    const occupancyRate=capacity?Math.round(100*occupied/capacity):0;

    return {
      stats: {
        totalHotels: hotels.length,
        publishedHotels,
        pendingHotels,
        totalBookings: bookings,
        totalRevenue, todayRevenue, monthRevenue, occupancyRate,
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
    if (!hotel) throw new NotFoundException('Hotel not found');

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
