import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class RoomAvailability extends Document {
  @Prop({ type: Types.ObjectId, ref: 'RoomType', required: true })
  roomTypeId: Types.ObjectId;

  @Prop({ required: true })
  date: Date;

  @Prop({ required: true })
  availableRooms: number;

  @Prop({ required: true })
  bookedRooms: number;

  @Prop()
  price: number;
}

export type RoomAvailabilityDocument = RoomAvailability;
export const RoomAvailabilitySchema = SchemaFactory.createForClass(RoomAvailability);

RoomAvailabilitySchema.index({ roomTypeId: 1, date: 1 }, { unique: true });
