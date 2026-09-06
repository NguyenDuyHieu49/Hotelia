import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Hotel, HotelDocument, HotelStatus } from './schemas/hotel.schema';
import { CreateHotelDto } from './dto/create-hotel.dto';
import { UpdateHotelDto } from './dto/update-hotel.dto';
import { SearchHotelsDto } from './dto/search-hotels.dto';

@Injectable()
export class HotelsService {
  constructor(@InjectModel(Hotel.name) private hotelModel: Model<HotelDocument>) {}

  async create(ownerId: string, dto: CreateHotelDto): Promise<HotelDocument> {
    const hotel = new this.hotelModel({
      ...dto,
      ownerId: new Types.ObjectId(ownerId),
      status: HotelStatus.DRAFT,
    });
    return hotel.save();
  }

  async findById(id: string): Promise<HotelDocument> {
    const hotel = await this.hotelModel.findById(id);
    if (!hotel) throw new NotFoundException('Hotel not found');
    return hotel;
  }

  async findByOwner(ownerId: string): Promise<HotelDocument[]> {
    return this.hotelModel.find({ ownerId: new Types.ObjectId(ownerId) }).sort({ createdAt: -1 });
  }

  async update(id: string, ownerId: string, dto: UpdateHotelDto): Promise<HotelDocument> {
    const hotel = await this.findById(id);
    if (hotel.ownerId.toString() !== ownerId) throw new ForbiddenException('Not your hotel');
    Object.assign(hotel, dto);
    return hotel.save();
  }

  async submitForApproval(id: string, ownerId: string): Promise<HotelDocument> {
    const hotel = await this.findById(id);
    if (hotel.ownerId.toString() !== ownerId) throw new ForbiddenException('Not your hotel');
    if (hotel.status === HotelStatus.PENDING_APPROVAL) throw new ForbiddenException('Already submitted');
    hotel.status = HotelStatus.PENDING_APPROVAL;
    return hotel.save();
  }

  async approve(id: string): Promise<HotelDocument> {
    const hotel = await this.findById(id);
    hotel.status = HotelStatus.PUBLISHED;
    return hotel.save();
  }

  async reject(id: string, reason: string): Promise<HotelDocument> {
    const hotel = await this.findById(id);
    hotel.status = HotelStatus.REJECTED;
    hotel.rejectionReason = reason;
    return hotel.save();
  }

  async findPending(): Promise<HotelDocument[]> {
    return this.hotelModel.find({ status: HotelStatus.PENDING_APPROVAL }).sort({ createdAt: -1 });
  }

  async search(dto: SearchHotelsDto): Promise<{ hotels: HotelDocument[]; total: number }> {
    const query: any = { status: HotelStatus.PUBLISHED };
    const page = dto.page || 1;
    const limit = Math.min(dto.limit || 20, 100);
    const skip = (page - 1) * limit;

    if (dto.destination) {
      query.$or = [
        { city: { $regex: dto.destination, $options: 'i' } },
        { district: { $regex: dto.destination, $options: 'i' } },
        { name: { $regex: dto.destination, $options: 'i' } },
      ];
    }

    if (dto.minRating) {
      query.averageRating = { $gte: dto.minRating };
    }

    let sort: any = { averageRating: -1 };
    if (dto.sortBy === 'price_low') sort = { 'minPrice': 1 };
    if (dto.sortBy === 'price_high') sort = { 'minPrice': -1 };

    const [hotels, total] = await Promise.all([
      this.hotelModel.find(query).sort(sort).skip(skip).limit(limit),
      this.hotelModel.countDocuments(query),
    ]);

    return { hotels, total };
  }

  async delete(id: string, ownerId: string): Promise<void> {
    const hotel = await this.findById(id);
    if (hotel.ownerId.toString() !== ownerId) throw new ForbiddenException('Not your hotel');
    await hotel.deleteOne();
  }

  async updateRating(hotelId: string, rating: number): Promise<void> {
    const hotel = await this.findById(hotelId);
    const totalScore = hotel.averageRating * hotel.reviewCount + rating;
    hotel.reviewCount += 1;
    hotel.averageRating = totalScore / hotel.reviewCount;
    await hotel.save();
  }
}
