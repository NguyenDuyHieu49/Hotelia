import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum HotelStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  PUBLISHED = 'PUBLISHED',
  REJECTED = 'REJECTED',
  SUSPENDED = 'SUSPENDED',
}

@Schema({ timestamps: true })
export class Hotel extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  address: string;

  @Prop({ required: true })
  city: string;

  @Prop()
  district: string;

  @Prop()
  country: string;

  @Prop()
  latitude: number;

  @Prop()
  longitude: number;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  ownerId: Types.ObjectId;

  @Prop({ type: String, enum: HotelStatus, default: HotelStatus.DRAFT })
  status: HotelStatus;

  @Prop({ default: 0 })
  starRating: number;

  @Prop({ default: 0 })
  averageRating: number;

  @Prop({ default: 0 })
  reviewCount: number;

  @Prop({ type: [String], default: [] })
  amenities: string[];

  @Prop({ default: '14:00' })
  checkInTime: string;

  @Prop({ default: '12:00' })
  checkOutTime: string;

  @Prop()
  rejectionReason: string;

  @Prop()
  images: string[];
}

export type HotelDocument = Hotel;
export const HotelSchema = SchemaFactory.createForClass(Hotel);

// Indexes
HotelSchema.index({ ownerId: 1 });
HotelSchema.index({ status: 1, city: 1 });
HotelSchema.index({ city: 1, district: 1 });
HotelSchema.index({ averageRating: -1 });
HotelSchema.index({ name: 'text', description: 'text', city: 'text' });
