import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, Connection } from 'mongoose';
import { RoomType, RoomTypeDocument } from './schemas/room-type.schema';
import { RoomAvailability, RoomAvailabilityDocument } from './schemas/room-availability.schema';
import { Hotel, HotelDocument } from './schemas/hotel.schema';
import { BookingStatus } from '../bookings/schemas/booking.schema';
import { Booking } from '../bookings/schemas/booking.schema';

@Injectable()
export class RoomTypesService {
  constructor(
    @InjectModel(RoomType.name) private roomTypeModel: Model<RoomTypeDocument>,
    @InjectModel(RoomAvailability.name) private availabilityModel: Model<RoomAvailabilityDocument>,
    @InjectModel(Hotel.name) private hotelModel: Model<HotelDocument>,
    @InjectModel(Booking.name) private bookingModel: Model<Booking>,
    private connection: Connection,
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
    if (hotel.ownerId.toString() !== ownerId) throw new ForbiddenException('Not your hotel');

    Object.assign(roomType, data);
    return roomType.save();
  }

  async checkAvailability(roomTypeId: string, checkIn: Date, checkOut: Date, rooms: number = 1): Promise<boolean> {
    const session = await this.connection.startSession();
    try {
      session.startTransaction();

      // Get all dates in range
      const dates: Date[] = [];
      const currentDate = new Date(checkIn);
      while (currentDate < checkOut) {
        dates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Check availability for each date
      for (const date of dates) {
        const availability = await this.availabilityModel.findOne({
          roomTypeId: new Types.ObjectId(roomTypeId),
          date,
        }).session(session);

        const roomType = await this.roomTypeModel.findById(roomTypeId).session(session);
        const available = availability?.availableRooms ?? roomType.totalRooms;

        if (available < rooms) {
          await session.abortTransaction();
          return false;
        }
      }

      await session.commitTransaction();
      return true;
    } finally {
      session.endSession();
    }
  }

  async reserveRooms(roomTypeId: string, checkIn: Date, checkOut: Date, rooms: number = 1): Promise<void> {
    const session = await this.connection.startSession();
    try {
      session.startTransaction();

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
          { upsert: true, session },
        );
        currentDate.setDate(currentDate.getDate() + 1);
      }

      await session.commitTransaction();
    } catch {
      await session.abortTransaction();
      throw new Error('Failed to reserve rooms');
    } finally {
      session.endSession();
    }
  }

  async releaseRooms(roomTypeId: string, checkIn: Date, checkOut: Date, rooms: number = 1): Promise<void> {
    const session = await this.connection.startSession();
    try {
      session.startTransaction();

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
          { session },
        );
        currentDate.setDate(currentDate.getDate() + 1);
      }

      await session.commitTransaction();
    } catch {
      await session.abortTransaction();
      throw new Error('Failed to release rooms');
    } finally {
      session.endSession();
    }
  }

  async getAvailability(roomTypeId: string, startDate: Date, endDate: Date): Promise<RoomAvailabilityDocument[]> {
    return this.availabilityModel.find({
      roomTypeId: new Types.ObjectId(roomTypeId),
      date: { $gte: startDate, $lte: endDate },
    }).sort({ date: 1 });
  }
}
