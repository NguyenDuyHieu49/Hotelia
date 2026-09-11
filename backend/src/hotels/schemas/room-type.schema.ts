import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class RoomType extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Hotel', required: true })
  hotelId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  basePrice: number;

  @Prop({ required: true })
  maxGuests: number;

  @Prop({ required: true })
  totalRooms: number;

  @Prop({ default: 0 })
  availableRooms: number;

  @Prop({ type: [String], default: [] })
  amenities: string[];

  @Prop()
  images: string[];

  @Prop({ default: true })
  isActive: boolean;
}

export type RoomTypeDocument = RoomType;
export const RoomTypeSchema = SchemaFactory.createForClass(RoomType);

RoomTypeSchema.index({ hotelId: 1 });
RoomTypeSchema.index({ basePrice: 1 });
