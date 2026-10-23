import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum PaymentMethod {
  PAYOS = 'PAYOS',
  // Kept for reading historical records. New payments only accept PAYOS.
  MOMO = 'MOMO',
  VNPAY = 'VNPAY',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CASH_ON_DELIVERY = 'CASH_ON_DELIVERY',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

@Schema({ timestamps: true })
export class Payment extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Booking', required: true })
  bookingId: Types.ObjectId;

  @Prop({ required: true })
  bookingKey: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  amount: number;

  @Prop({ type: String, enum: PaymentMethod, required: true })
  method: PaymentMethod;

  @Prop({ type: String, enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Prop()
  transactionId: string;

  @Prop({ type: Number })
  orderCode: number;

  @Prop()
  paymentUrl: string;

  @Prop()
  returnUrl: string;

  @Prop()
  cancelUrl: string;

  @Prop()
  expiresAt: Date;

  @Prop()
  metadata: string;

  @Prop()
  paidAt: Date;

  @Prop()
  failedAt: Date;

  @Prop()
  failureReason: string;
}

export type PaymentDocument = Payment;
export const PaymentSchema = SchemaFactory.createForClass(Payment);

PaymentSchema.index({ bookingId: 1 });
PaymentSchema.index({ bookingKey: 1 }, { unique: true });
PaymentSchema.index({ userId: 1, createdAt: -1 });
PaymentSchema.index({ transactionId: 1 });
PaymentSchema.index({ orderCode: 1 }, { unique: true, sparse: true });
PaymentSchema.index({ status: 1 });
