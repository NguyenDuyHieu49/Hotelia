import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument, OwnerStatus } from '../users/schemas/user.schema';
import { Hotel, HotelDocument, HotelStatus } from '../hotels/schemas/hotel.schema';
import { Booking, BookingDocument } from '../bookings/schemas/booking.schema';
import { Review, ReviewDocument } from '../reviews/schemas/review.schema';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Hotel.name) private hotelModel: Model<HotelDocument>,
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
  ) {}

  async getStats() {
    const [users, owners, hotels, bookings, reviews] = await Promise.all([
      this.userModel.countDocuments({ role: 'USER' }),
      this.userModel.countDocuments({ role: 'OWNER' }),
      this.hotelModel.countDocuments({ status: HotelStatus.PUBLISHED }),
      this.bookingModel.countDocuments(),
      this.reviewModel.countDocuments({ isVisible: true }),
    ]);

    return { users, owners, hotels, bookings, reviews };
  }

  async getPendingOwners() {
    return this.userModel.find({ ownerStatus: OwnerStatus.PENDING }).sort({ createdAt: -1 });
  }

  async approveOwner(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new Error('User not found');
    user.ownerStatus = OwnerStatus.APPROVED;
    user.role = 'OWNER';
    await user.save();
    return user;
  }

  async rejectOwner(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new Error('User not found');
    user.ownerStatus = OwnerStatus.REJECTED;
    await user.save();
    return user;
  }

  async getPendingHotels() {
    return this.hotelModel.find({ status: HotelStatus.PENDING_APPROVAL }).sort({ createdAt: -1 });
  }

  async approveHotel(hotelId: string) {
    const hotel = await this.hotelModel.findById(hotelId);
    if (!hotel) throw new Error('Hotel not found');
    hotel.status = HotelStatus.PUBLISHED;
    await hotel.save();
    return hotel;
  }

  async rejectHotel(hotelId: string, reason: string) {
    const hotel = await this.hotelModel.findById(hotelId);
    if (!hotel) throw new Error('Hotel not found');
    hotel.status = HotelStatus.REJECTED;
    hotel.rejectionReason = reason;
    await hotel.save();
    return hotel;
  }

  async getAllUsers(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.userModel.find().skip(skip).limit(limit).sort({ createdAt: -1 }),
      this.userModel.countDocuments(),
    ]);
    return { users, total, page, limit };
  }

  async suspendUser(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new Error('User not found');
    user.isActive = false;
    await user.save();
    return user;
  }

  async activateUser(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new Error('User not found');
    user.isActive = true;
    await user.save();
    return user;
  }
}
