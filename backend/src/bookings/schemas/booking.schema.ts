import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum BookingStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PAID = 'PAID',
  CONFIRMED = 'CONFIRMED',
  CHECKED_IN = 'CHECKED_IN',
  CHECKED_OUT = 'CHECKED_OUT',
  COMPLETED = 'COMPLETED',
  CANCEL_REQUESTED = 'CANCEL_REQUESTED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  EXPIRED = 'EXPIRED',
}

@Schema({ timestamps: true })
export class Booking extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Hotel', required: true })
  hotelId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'RoomType', required: true })
  roomTypeId: Types.ObjectId;

  @Prop()
  checkIn: Date;

  @Prop()
  checkOut: Date;

  @Prop({ default: 1 })
  guestCount: number;

  @Prop()
  guestName: string;

  @Prop()
  guestEmail: string;

  @Prop()
  guestPhone: string;

  @Prop()
  specialRequests: string;

  @Prop({ required: true })
  roomPrice: number;

  @Prop({ required: true })
  totalPrice: number;

  @Prop({ required: true })
  nights: number;

  @Prop({ type: String, enum: BookingStatus, default: BookingStatus.PENDING_PAYMENT })
  status: BookingStatus;

  @Prop()
  checkedInAt: Date;

  @Prop()
  checkedOutAt: Date;

  @Prop()
  cancelledAt: Date;

  @Prop()
  cancelReason: string;

  @Prop()
  refundAmount: number;
}

export type BookingDocument = Booking;
export const BookingSchema = SchemaFactory.createForClass(Booking);

BookingSchema.index({ userId: 1, createdAt: -1 });
BookingSchema.index({ hotelId: 1, checkIn: 1 });
BookingSchema.index({ roomTypeId: 1, checkIn: 1, checkOut: 1 });
BookingSchema.index({ status: 1 });
