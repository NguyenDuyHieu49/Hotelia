import { Injectable, NotFoundException, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Payment, PaymentDocument, PaymentStatus, PaymentMethod } from './schemas/payment.schema';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { MoMoProvider } from './providers/momo.provider';
import { VNPayProvider } from './providers/vnpay.provider';
import { BankTransferProvider } from './providers/bank-transfer.provider';
import { CODProvider } from './providers/cod.provider';
import { PaymentProvider } from './providers/payment-provider.interface';
import { BookingsService } from '../bookings/bookings.service';
import { BookingStatus } from '../bookings/booking-state.service';

@Injectable()
export class PaymentsService {
  private providers: Map<PaymentMethod, PaymentProvider>;

  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    private bookingsService: BookingsService,
    private moMoProvider: MoMoProvider,
    private vnPayProvider: VNPayProvider,
    private bankTransferProvider: BankTransferProvider,
    private codProvider: CODProvider,
  ) {
    this.providers = new Map([
      [PaymentMethod.MOMO, this.moMoProvider],
      [PaymentMethod.VNPAY, this.vnPayProvider],
      [PaymentMethod.BANK_TRANSFER, this.bankTransferProvider],
      [PaymentMethod.CASH_ON_DELIVERY, this.codProvider],
    ]);
  }

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
    const payment = await this.paymentModel.findOne({ transactionId });
    if (!payment) throw new NotFoundException('Payment not found');

    payment.status = PaymentStatus.COMPLETED;
    payment.paidAt = new Date();
    await payment.save();

    await this.bookingsService.updateStatus(payment.bookingId.toString(), BookingStatus.PAID);

    return payment;
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
    const payment = await this.findById(paymentId);

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException('Payment is not completed');
    }

    const provider = this.providers.get(payment.method);
    if (!provider) {
      throw new BadRequestException('Payment provider not found');
    }

    const result = await provider.refund(payment.transactionId, payment.amount);

    if (result.success) {
      payment.status = PaymentStatus.REFUNDED;
      await payment.save();

      await this.bookingsService.updateStatus(payment.bookingId.toString(), BookingStatus.REFUNDED);
    }

    return payment;
  }
}
