import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RoomType, RoomTypeDocument } from './schemas/room-type.schema';
import { RoomAvailability, RoomAvailabilityDocument } from './schemas/room-availability.schema';
import { Hotel, HotelDocument } from './schemas/hotel.schema';

@Injectable()
export class RoomTypesService {
  constructor(
    @InjectModel(RoomType.name) private roomTypeModel: Model<RoomTypeDocument>,
    @InjectModel(RoomAvailability.name) private availabilityModel: Model<RoomAvailabilityDocument>,
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

  async findByHotel(hotelId: string): Promise<RoomTypeDocument[]> {
    return this.roomTypeModel.find({ hotelId: new Types.ObjectId(hotelId), isActive: true });
  }

  async updateRoomType(ownerId: string, roomTypeId: string, data: any): Promise<RoomTypeDocument> {
    const roomType = await this.roomTypeModel.findById(roomTypeId);
    if (!roomType) throw new NotFoundException('Room type not found');

    const hotel = await this.hotelModel.findById(roomType.hotelId);
    if (!hotel) throw new NotFoundException('Hotel not found');
    if (hotel.ownerId.toString() !== ownerId) throw new ForbiddenException('Not your hotel');

    Object.assign(roomType, data);
    return roomType.save();
  }

  async checkAvailability(roomTypeId: string, checkIn: Date, checkOut: Date, rooms: number = 1): Promise<boolean> {
    const currentDate = new Date(checkIn);

    while (currentDate < checkOut) {
      const availability = await this.availabilityModel.findOne({
        roomTypeId: new Types.ObjectId(roomTypeId),
        date: new Date(currentDate),
      });

      const roomType = await this.roomTypeModel.findById(roomTypeId);
      if (!roomType) throw new NotFoundException('Room type not found');

      const available = availability?.availableRooms ?? roomType.totalRooms;
      if (available < rooms) {
        return false;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return true;
  }

  async reserveRooms(roomTypeId: string, checkIn: Date, checkOut: Date, rooms: number = 1): Promise<void> {
    const currentDate = new Date(checkIn);

    while (currentDate < checkOut) {
      await this.availabilityModel.findOneAndUpdate(
        {
          roomTypeId: new Types.ObjectId(roomTypeId),
          date: new Date(currentDate),
        },
        {
          $inc: { availableRooms: -rooms, bookedRooms: rooms },
        },
        { upsert: true },
      );
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  async releaseRooms(roomTypeId: string, checkIn: Date, checkOut: Date, rooms: number = 1): Promise<void> {
    const currentDate = new Date(checkIn);

    while (currentDate < checkOut) {
      await this.availabilityModel.findOneAndUpdate(
        {
          roomTypeId: new Types.ObjectId(roomTypeId),
          date: new Date(currentDate),
        },
        {
          $inc: { availableRooms: rooms, bookedRooms: -rooms },
        },
      );
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  async getAvailability(roomTypeId: string, startDate: Date, endDate: Date): Promise<RoomAvailabilityDocument[]> {
    return this.availabilityModel.find({
      roomTypeId: new Types.ObjectId(roomTypeId),
      date: { $gte: startDate, $lte: endDate },
    }).sort({ date: 1 });
  }
}
