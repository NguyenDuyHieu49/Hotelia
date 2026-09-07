import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, Connection } from 'mongoose';
import { Booking, BookingDocument, BookingStatus } from './schemas/booking.schema';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { BookingStateService } from './booking-state.service';
import { HotelsService } from '../hotels/hotels.service';

@Injectable()
export class BookingsService {
  constructor(
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    private stateService: BookingStateService,
    private hotelsService: HotelsService,
    private connection: Connection,
  ) {}

  async create(userId: string, dto: CreateBookingDto): Promise<BookingDocument> {
    const hotel = await this.hotelsService.findById(dto.hotelId);
    if (hotel.status !== 'PUBLISHED') {
      throw new BadRequestException('Hotel is not available for booking');
    }

    const checkIn = new Date(dto.checkIn);
    const checkOut = new Date(dto.checkOut);
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

    if (checkIn < new Date()) throw new BadRequestException('Check-in date must be in the future');
    if (checkOut <= checkIn) throw new BadRequestException('Check-out must be after check-in');

    // Mock price calculation (in real app, fetch from RoomType)
    const roomPrice = 100; // VND per night
    const totalPrice = roomPrice * nights;

    const booking = new this.bookingModel({
      userId: new Types.ObjectId(userId),
      hotelId: new Types.ObjectId(dto.hotelId),
      roomTypeId: new Types.ObjectId(dto.roomTypeId),
      checkIn,
      checkOut,
      guestCount: dto.guestCount,
      guestName: dto.guestName,
      guestEmail: dto.guestEmail,
      guestPhone: dto.guestPhone,
      specialRequests: dto.specialRequests,
      roomPrice,
      totalPrice,
      nights,
      status: BookingStatus.PENDING_PAYMENT,
    });

    return booking.save();
  }

  async findById(id: string): Promise<BookingDocument> {
    const booking = await this.bookingModel.findById(id);
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async findByUser(userId: string, status?: BookingStatus): Promise<BookingDocument[]> {
    const query: any = { userId: new Types.ObjectId(userId) };
    if (status) query.status = status;
    return this.bookingModel.find(query).sort({ createdAt: -1 });
  }

  async findByHotel(hotelId: string): Promise<BookingDocument[]> {
    return this.bookingModel.find({ hotelId: new Types.ObjectId(hotelId) }).sort({ checkIn: -1 });
  }

  async cancel(id: string, userId: string, dto: CancelBookingDto): Promise<BookingDocument> {
    const booking = await this.findById(id);

    if (booking.userId.toString() !== userId) {
      throw new ForbiddenException('Not your booking');
    }

    if (!this.stateService.canCancel(booking.status)) {
      throw new BadRequestException('Cannot cancel booking in current status');
    }

    const refundAmount = this.stateService.calculateRefund(booking);
    this.stateService.validateTransition(booking.status, BookingStatus.CANCELLED);

    booking.status = BookingStatus.CANCELLED;
    booking.cancelledAt = new Date();
    booking.cancelReason = dto.reason;
    booking.refundAmount = refundAmount;

    return booking.save();
  }

  async checkIn(id: string, ownerId: string): Promise<BookingDocument> {
    const booking = await this.findById(id);
    const hotel = await this.hotelsService.findById(booking.hotelId.toString());

    if (hotel.ownerId.toString() !== ownerId) {
      throw new ForbiddenException('Not your hotel');
    }

    this.stateService.validateTransition(booking.status, BookingStatus.CHECKED_IN);
    booking.status = BookingStatus.CHECKED_IN;
    booking.checkedInAt = new Date();

    return booking.save();
  }

  async checkOut(id: string, ownerId: string): Promise<BookingDocument> {
    const booking = await this.findById(id);
    const hotel = await this.hotelsService.findById(booking.hotelId.toString());

    if (hotel.ownerId.toString() !== ownerId) {
      throw new ForbiddenException('Not your hotel');
    }

    this.stateService.validateTransition(booking.status, BookingStatus.CHECKED_OUT);
    booking.status = BookingStatus.CHECKED_OUT;
    booking.checkedOutAt = new Date();

    return booking.save();
  }

  async updateStatus(id: string, status: BookingStatus): Promise<BookingDocument> {
    const booking = await this.findById(id);
    this.stateService.validateTransition(booking.status, status);
    booking.status = status;
    return booking.save();
  }
}
