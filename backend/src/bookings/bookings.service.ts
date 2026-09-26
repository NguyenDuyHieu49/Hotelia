import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { Booking, BookingDocument, BookingStatus } from './schemas/booking.schema';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { BookingStateService } from './booking-state.service';
import { HotelsService } from '../hotels/hotels.service';
import { stayDates, occupyingBookings, freeRooms, expiredHold } from './booking-rules';
import { objectId } from '../account/account.module';

@Injectable()
export class BookingsService {
  constructor(
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    private stateService: BookingStateService,
    private hotelsService: HotelsService,
    @InjectConnection() private connection: Connection,
  ) {}

  async create(userId: string, dto: CreateBookingDto): Promise<BookingDocument> {
    const {checkIn,checkOut,nights}=stayDates(dto.checkIn,dto.checkOut);
    if(!Number.isInteger(dto.guestCount) || dto.guestCount<1) throw new BadRequestException('Số khách không hợp lệ');
    const session=await this.connection.startSession();
    let created: BookingDocument;
    try {
      await session.withTransaction(async()=>{
        const db=this.connection.db!;
        const hotel=await db.collection('hotels').findOne({_id:objectId(dto.hotelId),status:'PUBLISHED'},{session});
        if(!hotel) throw new BadRequestException('Khách sạn chưa nhận đặt phòng');
        // Serialize reservations for this room type to prevent concurrent overselling.
        const room=await db.collection('roomtypes').findOneAndUpdate({_id:objectId(dto.roomTypeId),hotelId:hotel._id,isActive:true},{$inc:{inventoryVersion:1}},{session,returnDocument:'after'});
        if(!room) throw new BadRequestException('Loại phòng không thuộc khách sạn hoặc đã ngừng bán');
        if(dto.guestCount>room.maxGuests) throw new BadRequestException('Số khách vượt sức chứa loại phòng');
        if(!Number.isFinite(room.basePrice) || room.basePrice<=0) throw new BadRequestException('Giá phòng chưa hợp lệ');
        const overlapping=await db.collection('bookings').find({roomTypeId:room._id,checkIn:{$lt:checkOut},checkOut:{$gt:checkIn},...occupyingBookings()},{session}).toArray();
        if(freeRooms(room.totalRooms,checkIn,checkOut,overlapping as any)<1) throw new BadRequestException('Loại phòng đã hết trong thời gian đã chọn');
        [created]=await this.bookingModel.create([{
          ...dto,userId:objectId(userId),hotelId:hotel._id,roomTypeId:room._id,checkIn,checkOut,nights,
          hotelName:hotel.name,roomTypeName:room.name,roomPrice:room.basePrice,totalPrice:room.basePrice*nights,
          status:BookingStatus.PENDING_PAYMENT,holdExpiresAt:new Date(Date.now()+15*60000),
        }],{session});
        await db.collection('notifications').insertOne({userId:objectId(userId),title:'Đã giữ phòng',message:`${hotel.name}: vui lòng chọn phương thức thanh toán trong 15 phút.`,type:'BOOKING',relatedId:created._id,isRead:false,createdAt:new Date()},{session});
      });
    } finally {await session.endSession();}
    return created!;
  }

  async findAccessible(id:string,userId:string,role:string) {
    const booking=await this.findById(id);
    if(role==='ADMIN' || String(booking.userId)===userId) return booking;
    const hotel=await this.hotelsService.findById(String(booking.hotelId));
    if(role==='OWNER' && String(hotel.ownerId)===userId) return booking;
    throw new ForbiddenException('Not your booking');
  }

  async findById(id: string): Promise<BookingDocument> {
    await this.bookingModel.updateOne({_id:objectId(id),status:BookingStatus.PENDING_PAYMENT,...expiredHold()},{$set:{status:BookingStatus.EXPIRED}});
    const booking = await this.bookingModel.findById(id);
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async findByUser(userId: string, status?: BookingStatus): Promise<BookingDocument[]> {
    await this.bookingModel.updateMany({userId:objectId(userId),status:BookingStatus.PENDING_PAYMENT,...expiredHold()},{$set:{status:BookingStatus.EXPIRED}});
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

    const next=booking.status===BookingStatus.PENDING_PAYMENT ? BookingStatus.CANCELLED : BookingStatus.CANCEL_REQUESTED;
    const updated=await this.bookingModel.findOneAndUpdate({_id:booking._id,status:booking.status},{$set:{status:next,cancelledAt:next===BookingStatus.CANCELLED?new Date():undefined,cancelReason:dto.reason || ''}},{new:true});
    if(!updated) throw new BadRequestException('Booking đã thay đổi. Vui lòng tải lại');
    return updated;
  }

  async confirmPayAtHotel(id:string,userId:string) {
    const booking=await this.findAccessible(id,userId,'USER');
    if(booking.status===BookingStatus.CONFIRMED) return booking;
    if(booking.status!==BookingStatus.PENDING_PAYMENT) throw new BadRequestException('Booking không còn chờ xác nhận');
    const updated=await this.bookingModel.findOneAndUpdate({_id:booking._id,status:BookingStatus.PENDING_PAYMENT,...occupyingBookings()},{$set:{status:BookingStatus.CONFIRMED}},{new:true});
    if(!updated) throw new BadRequestException('Thời gian giữ phòng đã hết');
    return updated;
  }

  async checkIn(id: string, ownerId: string): Promise<BookingDocument> {
    const booking = await this.findById(id);
    const hotel = await this.hotelsService.findById(booking.hotelId.toString());

    if (hotel.ownerId.toString() !== ownerId) {
      throw new ForbiddenException('Not your hotel');
    }

    this.stateService.validateTransition(booking.status, BookingStatus.CHECKED_IN);
    const today=new Date(Date.now()+7*3600000).toISOString().slice(0,10);
    if(today<booking.checkIn.toISOString().slice(0,10) || today>=booking.checkOut.toISOString().slice(0,10)) throw new BadRequestException('Chưa đến ngày nhận phòng hoặc đã quá ngày trả phòng');
    return this.transition(booking,BookingStatus.CHECKED_IN,{checkedInAt:new Date()});
  }

  async checkOut(id: string, ownerId: string): Promise<BookingDocument> {
    const booking = await this.findById(id);
    const hotel = await this.hotelsService.findById(booking.hotelId.toString());

    if (hotel.ownerId.toString() !== ownerId) {
      throw new ForbiddenException('Not your hotel');
    }

    this.stateService.validateTransition(booking.status, BookingStatus.CHECKED_OUT);
    return this.transition(booking,BookingStatus.CHECKED_OUT,{checkedOutAt:new Date()});
  }

  async updateStatus(id: string, status: BookingStatus): Promise<BookingDocument> {
    const booking = await this.findById(id);
    this.stateService.validateTransition(booking.status, status);
    return this.transition(booking,status);
  }

  private async transition(booking:BookingDocument,status:BookingStatus,extra={}) {
    const updated=await this.bookingModel.findOneAndUpdate({_id:booking._id,status:booking.status},{$set:{status,...extra}},{new:true});
    if(!updated) throw new BadRequestException('Booking đã thay đổi. Vui lòng tải lại');
    return updated;
  }

  async resolveCancellation(id:string,userId:string,role:string) {
    const booking=await this.findAccessible(id,userId,role);
    if(role!=='ADMIN') {
      const hotel=await this.hotelsService.findById(String(booking.hotelId));
      if(String(hotel.ownerId)!==userId) throw new ForbiddenException('Not your hotel');
    }
    if(booking.status!==BookingStatus.CANCEL_REQUESTED) throw new BadRequestException('Booking chưa yêu cầu hủy');
    const payment=await this.connection.db!.collection('payments').findOne({bookingId:booking._id,status:'COMPLETED'});
    if(payment) throw new BadRequestException('Cần xử lý hoàn tiền với nhà cung cấp trước khi xác nhận hủy');
    return this.transition(booking,BookingStatus.CANCELLED,{cancelledAt:new Date(),refundAmount:0});
  }
}
