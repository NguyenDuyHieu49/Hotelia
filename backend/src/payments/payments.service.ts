import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Payment, PaymentDocument, PaymentStatus } from './schemas/payment.schema';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
  ) {}

  async create(userId: string, dto: CreatePaymentDto): Promise<PaymentDocument> {
    // Existing provider classes are placeholders, not payment gateway integrations.
    // Pay-at-hotel is a booking confirmation, never a claim that money was received.
    throw new ServiceUnavailableException('Thanh toán trực tuyến chưa được cấu hình. Hãy chọn thanh toán tại khách sạn.');
  }

  async findById(id: string): Promise<PaymentDocument> {
    const payment = await this.paymentModel.findById(id);
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  async findByBooking(bookingId: string): Promise<PaymentDocument | null> {
    return this.paymentModel.findOne({ bookingId: new Types.ObjectId(bookingId) });
  }

  async findByUser(userId: string): Promise<PaymentDocument[]> {
    return this.paymentModel.find({ userId: new Types.ObjectId(userId) }).sort({ createdAt: -1 });
  }

  async confirm(transactionId: string): Promise<PaymentDocument> {
    throw new ServiceUnavailableException('Không thể xác nhận thanh toán khi cổng thanh toán chưa được cấu hình.');
  }

  async fail(transactionId: string, reason: string): Promise<PaymentDocument> {
    const payment = await this.paymentModel.findOne({ transactionId });
    if (!payment) throw new NotFoundException('Payment not found');

    payment.status = PaymentStatus.FAILED;
    payment.failedAt = new Date();
    payment.failureReason = reason;
    await payment.save();

    return payment;
  }

  async refund(paymentId: string): Promise<PaymentDocument> {
    throw new ServiceUnavailableException('Không thể hoàn tiền tự động khi cổng thanh toán chưa được cấu hình.');
  }
}
