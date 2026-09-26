import { BadRequestException } from '@nestjs/common';
import { IsOptional, IsInt, IsNumber, IsString, Min, Max, Matches } from 'class-validator';
import { Db } from 'mongodb';
import { stayDates, occupyingBookings, freeRooms } from '../bookings/booking-rules';
export class CatalogFilter {
  @IsOptional() @IsNumber() @Min(0) minPrice?:number;
  @IsOptional() @IsNumber() @Min(0) maxPrice?:number;
  @IsOptional() @IsInt() @Min(1) @Max(10) guests?:number;
  @IsOptional() @IsInt() @Min(1) @Max(5) minRating?:number;
  @IsOptional() @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) checkIn?:string;
  @IsOptional() @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) checkOut?:string;
}
export const hasRoomFilter=(dto:CatalogFilter)=>dto.guests!==undefined || dto.minPrice!==undefined || dto.maxPrice!==undefined || dto.checkIn!==undefined || dto.checkOut!==undefined;
export async function eligibleRooms(db:Db,dto:CatalogFilter) {
  if((dto.minPrice ?? 0)>(dto.maxPrice ?? Infinity)) throw new BadRequestException('Giá tối đa phải lớn hơn hoặc bằng giá tối thiểu');
  if(Boolean(dto.checkIn)!==Boolean(dto.checkOut)) throw new BadRequestException('Cần cả ngày nhận và trả phòng');
  const stay=dto.checkIn && dto.checkOut ? stayDates(dto.checkIn,dto.checkOut) : undefined;
  const rooms=await db.collection('roomtypes').find({isActive:true,totalRooms:{$gt:0},maxGuests:{$gte:dto.guests || 1},basePrice:{$gte:dto.minPrice ?? 0,...(dto.maxPrice!==undefined?{$lte:dto.maxPrice}:{})}}).toArray();
  if(!stay) return rooms;
  const bookings=await db.collection('bookings').find({roomTypeId:{$in:rooms.map(r=>r._id)},checkIn:{$lt:stay.checkOut},checkOut:{$gt:stay.checkIn},...occupyingBookings()}).toArray();
  return rooms.filter(r=>freeRooms(r.totalRooms,stay.checkIn,stay.checkOut,bookings.filter(b=>String(b.roomTypeId)===String(r._id)) as any)>0);
}
