import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { RoomType, RoomTypeDocument } from './schemas/room-type.schema';
import { occupyingBookings, freeRooms, stayDates, DAY } from '../bookings/booking-rules';
import { objectId } from '../account/account.module';
import { Hotel, HotelDocument } from './schemas/hotel.schema';

@Injectable()
export class RoomTypesService {
  constructor(
    @InjectModel(RoomType.name) private roomTypeModel: Model<RoomTypeDocument>,
    @InjectConnection() private connection:Connection,
    @InjectModel(Hotel.name) private hotelModel: Model<HotelDocument>,
  ) {}

  async createRoomType(ownerId: string, hotelId: string, data: any): Promise<RoomTypeDocument> {
    const hotel = await this.hotelModel.findById(hotelId);
    if (!hotel) throw new NotFoundException('Hotel not found');
    if (hotel.ownerId.toString() !== ownerId) throw new ForbiddenException('Not your hotel');

    const roomType = new this.roomTypeModel({
      hotelId: new Types.ObjectId(hotelId),
      ...data,
      availableRooms: data.totalRooms,
    });
    return roomType.save();
  }

  async findByHotel(hotelId: string, checkIn?:string, checkOut?:string): Promise<any[]> {
    const rooms=await this.roomTypeModel.find({ hotelId: objectId(hotelId), isActive: true });
    if(!checkIn && !checkOut) return rooms;
    if(!checkIn || !checkOut) throw new BadRequestException('Cần cả ngày nhận và trả phòng');
    const stay=stayDates(checkIn,checkOut);
    const bookings=await this.connection.db!.collection('bookings').find({
      roomTypeId:{$in:rooms.map(room=>room._id)},
      checkIn:{$lt:stay.checkOut},checkOut:{$gt:stay.checkIn},...occupyingBookings(),
    }).toArray();
    return rooms.map(room=>({
      ...room.toObject(),
      availableRooms:freeRooms(room.totalRooms,stay.checkIn,stay.checkOut,
        bookings.filter(booking=>String(booking.roomTypeId)===String(room._id)) as any),
    }));
  }

  async updateRoomType(ownerId: string, roomTypeId: string, data: any): Promise<RoomTypeDocument> {
    const session=await this.connection.startSession();
    try {
      let updated:RoomTypeDocument;
      await session.withTransaction(async()=>{
        // Booking creation writes the same room document, so inventory edits and bookings serialize.
        const room=await this.connection.db!.collection('roomtypes').findOneAndUpdate(
          {_id:objectId(roomTypeId)},{$inc:{inventoryVersion:1}},{session,returnDocument:'after'});
        if(!room) throw new NotFoundException('Room type not found');
        const hotel=await this.hotelModel.findById(room.hotelId).session(session);
        if(!hotel) throw new NotFoundException('Hotel not found');
        if(String(hotel.ownerId)!==ownerId) throw new ForbiddenException('Not your hotel');
        if(data.totalRooms!==undefined && data.totalRooms<room.totalRooms) {
          const today=new Date(new Date(Date.now()+7*3600000).toISOString().slice(0,10)+'T00:00:00Z');
          const bookings=await this.connection.db!.collection('bookings').find({roomTypeId:room._id,checkOut:{$gt:today},...occupyingBookings()},{session}).toArray();
          const dates=new Set<number>([+today]);
          for(const booking of bookings) dates.add(Math.max(+today,+new Date(booking.checkIn)));
          for(const date of [...dates].sort((a,b)=>a-b)) {
            const occupied=bookings.filter(b=>+new Date(b.checkIn)<=date && +new Date(b.checkOut)>date).length;
            if(occupied>data.totalRooms) throw new BadRequestException('Số phòng mới nhỏ hơn số phòng đã đặt trong tương lai');
          }
        }
        const roomType=await this.roomTypeModel.findById(roomTypeId).session(session);
        Object.assign(roomType!,data);
        if(data.totalRooms!==undefined) roomType!.availableRooms=data.totalRooms;
        updated=await roomType!.save({session});
      });
      return updated!;
    } finally {await session.endSession();}
  }

  async getAvailability(roomTypeId:string,startDate:Date,endDate:Date) {
    if(!Number.isFinite(+startDate) || !Number.isFinite(+endDate) || endDate<startDate || (+endDate-+startDate)/DAY>90) throw new BadRequestException('Khoảng ngày không hợp lệ (tối đa 90 ngày)');
    const room=await this.roomTypeModel.findById(objectId(roomTypeId));
    if(!room) throw new NotFoundException('Room type not found');
    const start=new Date(startDate.toISOString().slice(0,10)+'T00:00:00Z');
    const end=new Date(endDate.toISOString().slice(0,10)+'T00:00:00Z');
    const bookings=await this.connection.db!.collection('bookings').find({roomTypeId:room._id,checkIn:{$lt:new Date(+end+DAY)},checkOut:{$gt:start},...occupyingBookings()}).toArray();
    const result=[];
    for(let day=+start;day<=+end;day+=DAY) {
      const availableRooms=freeRooms(room.totalRooms,new Date(day),new Date(day+DAY),bookings as any);
      result.push({roomTypeId:room._id,date:new Date(day),availableRooms,bookedRooms:room.totalRooms-availableRooms,price:room.basePrice});
    }
    return result;
  }
}
