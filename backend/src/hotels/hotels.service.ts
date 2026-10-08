import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { Hotel, HotelDocument, HotelStatus } from './schemas/hotel.schema';
import { CreateHotelDto } from './dto/create-hotel.dto';
import { UpdateHotelDto } from './dto/update-hotel.dto';
import { SearchHotelsDto } from './dto/search-hotels.dto';
import { eligibleRooms, hasRoomFilter } from './catalog-filter';
import { bookingEnabledHotelIds, presentPublicHotel } from './public-hotel';

@Injectable()
export class HotelsService {
  constructor(@InjectModel(Hotel.name) private hotelModel: Model<HotelDocument>, @InjectConnection() private connection:Connection) {}

  private async publicHotels(hotels: HotelDocument[], includeEditorialReviews = false) {
    const listings = hotels.map(hotel => hotel.toObject());
    const enabledIds = await bookingEnabledHotelIds(this.connection.db!, listings);
    return listings.map(hotel => presentPublicHotel(hotel, enabledIds, includeEditorialReviews));
  }

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

  async findPublicById(id: string) {
    const hotel = await this.hotelModel.findOne({ _id: id, status: HotelStatus.PUBLISHED });
    if (!hotel) throw new NotFoundException('Hotel not found');
    return (await this.publicHotels([hotel], true))[0];
  }

  async findByOwner(ownerId: string) {
    const hotels = await this.hotelModel.find({ ownerId: new Types.ObjectId(ownerId), isDemoCatalog: { $ne: true } }).sort({ createdAt: -1 });
    return this.publicHotels(hotels);
  }

  async update(id: string, ownerId: string, dto: UpdateHotelDto): Promise<HotelDocument> {
    const hotel = await this.findById(id);
    if (hotel.ownerId.toString() !== ownerId || hotel.isDemoCatalog) throw new ForbiddenException('Not your hotel');
    Object.assign(hotel, dto);
    return hotel.save();
  }

  async submitForApproval(id: string, ownerId: string): Promise<HotelDocument> {
    const hotel = await this.findById(id);
    if (hotel.ownerId.toString() !== ownerId || hotel.isDemoCatalog) throw new ForbiddenException('Not your hotel');
    if (![HotelStatus.DRAFT, HotelStatus.REJECTED].includes(hotel.status)) throw new ForbiddenException('Only draft or rejected hotels can be submitted');
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

  async search(dto: SearchHotelsDto) {
    const query: any = { status: HotelStatus.PUBLISHED };
    let matchingRooms:Awaited<ReturnType<typeof eligibleRooms>> | undefined;
    if(hasRoomFilter(dto)) {
      matchingRooms=await eligibleRooms(this.connection.db!,dto);
      query._id={$in:matchingRooms.map(r=>r.hotelId)};
    }
    const page = Math.max(1, Math.floor(dto.page || 1));
    const limit = Math.min(Math.max(1,Math.floor(dto.limit || 20)), 100);
    const skip = (page - 1) * limit;

    if (dto.destination?.trim()) {
      const escaped=dto.destination.trim().slice(0,100).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      query.$or = [
        { city: { $regex: escaped, $options: 'i' } },
        { district: { $regex: escaped, $options: 'i' } },
        { name: { $regex: escaped, $options: 'i' } },
      ];
    }

    if (dto.minRating) {
      query.averageRating = { $gte: dto.minRating };
      query.reviewCount = { $gt: 0 };
    }
    if(dto.amenities?.trim()) {
      const amenities=dto.amenities.split(',').map(a=>a.trim().toLowerCase()).filter(Boolean).slice(0,20);
      if(amenities.length) query.amenities={$all:amenities};
    }

    if(dto.sortBy==='price_low' || dto.sortBy==='price_high') {
      const rooms=matchingRooms ?? await eligibleRooms(this.connection.db!,dto);
      const cheapest=new Map<string,number>();
      for(const room of rooms) {
        const id=String(room.hotelId);
        cheapest.set(id,Math.min(cheapest.get(id) ?? Infinity,room.basePrice));
      }
      const hotels=await this.hotelModel.find(query);
      const direction=dto.sortBy==='price_low'?1:-1;
      hotels.sort((a,b)=>{
        const ap=cheapest.get(String(a._id)) ?? Infinity,bp=cheapest.get(String(b._id)) ?? Infinity;
        if(ap===Infinity) return bp===Infinity?0:1;
        if(bp===Infinity) return -1;
        return direction*(ap-bp) || (b.averageRating-a.averageRating);
      });
      return {hotels:await this.publicHotels(hotels.slice(skip,skip+limit)),total:hotels.length};
    }

    const [hotels, total] = await Promise.all([
      this.hotelModel.find(query).sort({ averageRating: -1 }).skip(skip).limit(limit),
      this.hotelModel.countDocuments(query),
    ]);

    return { hotels: await this.publicHotels(hotels), total };
  }

  async delete(id: string, ownerId: string): Promise<void> {
    const hotel = await this.findById(id);
    if (hotel.ownerId.toString() !== ownerId || hotel.isDemoCatalog) throw new ForbiddenException('Not your hotel');
    hotel.status = HotelStatus.SUSPENDED;
    await hotel.save();
  }

  async updateRating(hotelId: string, rating: number): Promise<void> {
    const hotel = await this.findById(hotelId);
    const totalScore = hotel.averageRating * hotel.reviewCount + rating;
    hotel.reviewCount += 1;
    hotel.averageRating = totalScore / hotel.reviewCount;
    await hotel.save();
  }
}
