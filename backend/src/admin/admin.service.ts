import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { User, UserDocument, OwnerStatus, UserRole } from '../users/schemas/user.schema';
import { Hotel, HotelDocument, HotelStatus } from '../hotels/schemas/hotel.schema';
import { Booking, BookingDocument } from '../bookings/schemas/booking.schema';
import { Review, ReviewDocument } from '../reviews/schemas/review.schema';

@Injectable()
export class AdminService {
  constructor(
    @InjectConnection() private connection:Connection,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Hotel.name) private hotelModel: Model<HotelDocument>,
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
  ) {}

  async payments() {return this.connection.db!.collection('payments').find().sort({createdAt:-1}).limit(200).toArray();}
  async auditLogs() {return this.connection.db!.collection('audit_logs').find().sort({createdAt:-1}).limit(200).toArray();}
  async reviews() {return this.reviewModel.find().sort({createdAt:-1}).limit(200);}

  async allHotels() {return this.hotelModel.find().sort({createdAt:-1});}
  async allBookings() {return this.bookingModel.find().sort({createdAt:-1});}
  async allOwners() {return this.userModel.find({ownerStatus:{$exists:true}}).select('-passwordHash -refreshToken -refreshTokenExpiry');}

  async getStats() {
    const [users, owners, hotels, bookings, reviews] = await Promise.all([
      this.userModel.countDocuments({ role: UserRole.USER }),
      this.userModel.countDocuments({ role: UserRole.OWNER }),
      this.hotelModel.countDocuments({ status: HotelStatus.PUBLISHED }),
      this.bookingModel.countDocuments(),
      this.reviewModel.countDocuments({ isVisible: true }),
    ]);

    return { users, owners, hotels, bookings, reviews };
  }

  async getPendingOwners(): Promise<Record<string, unknown>[]> {
    return this.userModel.find({ ownerStatus: OwnerStatus.PENDING }).select('-passwordHash -refreshToken -refreshTokenExpiry').sort({ createdAt: -1 }).lean().then(users=>users.map(u=>({...u,id:u._id})));
  }

  async approveOwner(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    if(user.ownerStatus!==OwnerStatus.PENDING) throw new BadRequestException('Application is not pending');
    user.ownerStatus = OwnerStatus.APPROVED;
    user.role = UserRole.OWNER;
    await user.save();
    const {passwordHash,refreshToken,refreshTokenExpiry,...safe}=user.toObject();
    return {...safe,id:String(safe._id)};
  }

  async rejectOwner(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    if(user.ownerStatus!==OwnerStatus.PENDING) throw new BadRequestException('Application is not pending');
    user.ownerStatus = OwnerStatus.REJECTED;
    await user.save();
    const {passwordHash,refreshToken,refreshTokenExpiry,...safe}=user.toObject();
    return {...safe,id:String(safe._id)};
  }

  async getPendingHotels() {
    return this.hotelModel.find({ status: HotelStatus.PENDING_APPROVAL }).sort({ createdAt: -1 });
  }

  async approveHotel(hotelId: string) {
    const hotel = await this.hotelModel.findById(hotelId);
    if (!hotel) throw new NotFoundException('Hotel not found');
    if(hotel.status!==HotelStatus.PENDING_APPROVAL) throw new BadRequestException('Hotel is not pending');
    hotel.status = HotelStatus.PUBLISHED;
    await hotel.save();
    return hotel;
  }

  async rejectHotel(hotelId: string, reason: string) {
    const hotel = await this.hotelModel.findById(hotelId);
    if (!hotel) throw new NotFoundException('Hotel not found');
    if(hotel.status!==HotelStatus.PENDING_APPROVAL || !reason?.trim()) throw new BadRequestException('Pending hotel and rejection reason required');
    hotel.status = HotelStatus.REJECTED;
    hotel.rejectionReason = reason;
    await hotel.save();
    return hotel;
  }

  async getAllUsers(page = 1, limit = 20, search = '', role = '') {
    page = Math.max(1, Number(page) || 1);
    limit = Math.min(100, Math.max(1, Number(limit) || 20));
    const query: Record<string, unknown> = {};
    if (['USER', 'OWNER', 'ADMIN'].includes(role)) query.role = role;
    if (search.trim()) {
      const safeSearch = search.trim().slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [{ name: { $regex: safeSearch, $options: 'i' } }, { email: { $regex: safeSearch, $options: 'i' } }];
    }
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.userModel.find(query).select('-passwordHash -refreshToken -refreshTokenExpiry').skip(skip).limit(limit).sort({ createdAt: -1 }),
      this.userModel.countDocuments(query),
    ]);
    return { users, total, page, limit };
  }

  async suspendUser(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    user.isActive = false;
    await user.save();
    const {passwordHash,refreshToken,refreshTokenExpiry,...safe}=user.toObject();
    return {...safe,id:String(safe._id)};
  }

  async activateUser(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    user.isActive = true;
    await user.save();
    const {passwordHash,refreshToken,refreshTokenExpiry,...safe}=user.toObject();
    return {...safe,id:String(safe._id)};
  }
}
