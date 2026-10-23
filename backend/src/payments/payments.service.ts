import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { randomInt } from 'node:crypto';
import { Connection, Model, Types } from 'mongoose';
import { Booking, BookingDocument, BookingStatus } from '../bookings/schemas/booking.schema';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PayOSClient, PayOSWebhookPayload } from './providers/payos.client';
import {
  Payment,
  PaymentDocument,
  PaymentMethod,
  PaymentStatus,
} from './schemas/payment.schema';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(Payment.name) private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(Booking.name) private readonly bookingModel: Model<BookingDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly payOS: PayOSClient,
  ) {}

  async create(userId: string, dto: CreatePaymentDto): Promise<PaymentDocument> {
    if (!this.payOS.isConfigured()) {
      throw new ServiceUnavailableException('Kênh thanh toán payOS chưa được cấu hình');
    }
    const bookingId = this.objectId(dto.bookingId, 'Mã đặt phòng không hợp lệ');
    const userObjectId = this.objectId(userId, 'Tài khoản không hợp lệ');
    const booking = await this.bookingModel.findOne({ _id: bookingId, userId: userObjectId });
    if (!booking) throw new NotFoundException('Không tìm thấy đặt phòng');

    const now = new Date();
    if (
      booking.status === BookingStatus.PENDING_PAYMENT &&
      booking.holdExpiresAt &&
      booking.holdExpiresAt <= now
    ) {
      await this.bookingModel.updateOne(
        { _id: booking._id, status: BookingStatus.PENDING_PAYMENT },
        { $set: { status: BookingStatus.EXPIRED } },
      );
      throw new BadRequestException('Thời gian giữ phòng đã hết');
    }

    const existing = await this.paymentModel.findOne({ bookingId: booking._id });
    if (existing) {
      const reusable = await this.reuseExisting(existing);
      if (reusable) return reusable;
    }
    if (booking.status !== BookingStatus.PENDING_PAYMENT) {
      throw new BadRequestException('Đặt phòng không còn chờ thanh toán');
    }

    const amount = Number(booking.totalPrice);
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      throw new BadRequestException('Tổng tiền đặt phòng không hợp lệ');
    }
    const orderCode = this.newOrderCode();
    const expiresAt = booking.holdExpiresAt ?? new Date(Date.now() + 15 * 60_000);
    if (expiresAt <= now) throw new BadRequestException('Thời gian giữ phòng đã hết');

    let payment: PaymentDocument;
    if (existing) {
      const claimed = await this.paymentModel.findOneAndUpdate(
        { _id: existing._id, status: PaymentStatus.FAILED },
        {
          $set: {
            amount,
            bookingKey: String(booking._id),
            method: PaymentMethod.PAYOS,
            status: PaymentStatus.PROCESSING,
            orderCode,
            expiresAt,
            returnUrl: this.payOS.returnUrl,
            cancelUrl: this.payOS.cancelUrl,
          },
          $unset: {
            transactionId: 1,
            paymentUrl: 1,
            paidAt: 1,
            failedAt: 1,
            failureReason: 1,
          },
        },
        { new: true },
      );
      if (!claimed) throw new ConflictException('Thanh toán đang được xử lý. Vui lòng thử lại');
      payment = claimed;
    } else {
      try {
        payment = await this.paymentModel.create({
          bookingId: booking._id,
          bookingKey: String(booking._id),
          userId: booking.userId,
          amount,
          method: PaymentMethod.PAYOS,
          status: PaymentStatus.PROCESSING,
          orderCode,
          expiresAt,
          returnUrl: this.payOS.returnUrl,
          cancelUrl: this.payOS.cancelUrl,
        });
      } catch (error) {
        if (this.isDuplicateKey(error)) {
          const concurrent = await this.paymentModel.findOne({ bookingId: booking._id });
          if (concurrent) {
            const reusable = await this.reuseExisting(concurrent);
            if (reusable) return reusable;
          }
          throw new ConflictException('Thanh toán đang được xử lý. Vui lòng thử lại');
        }
        throw error;
      }
    }

    try {
      const link = await this.payOS.createPaymentLink({
        orderCode,
        amount,
        description: `HOTELIA ${orderCode}`,
        returnUrl: this.payOS.returnUrl,
        cancelUrl: this.payOS.cancelUrl,
        expiredAt: Math.floor(expiresAt.getTime() / 1000),
        itemName: booking.hotelName || 'Hotelia booking',
      });
      const stillHeld = await this.bookingModel.exists({
        _id: booking._id,
        status: BookingStatus.PENDING_PAYMENT,
        holdExpiresAt: { $gt: new Date() },
      });
      if (!stillHeld) {
        await this.payOS.cancelPaymentLink(orderCode, 'Booking is no longer awaiting payment');
        await this.paymentModel.updateOne(
          { _id: payment._id, orderCode },
          { $set: { status: PaymentStatus.CANCELLED, failureReason: 'BOOKING_NOT_PENDING' } },
        );
        throw new BadRequestException('Đặt phòng không còn chờ thanh toán');
      }
      const updated = await this.paymentModel.findOneAndUpdate(
        { _id: payment._id, status: PaymentStatus.PROCESSING, orderCode },
        {
          $set: {
            status: PaymentStatus.PENDING,
            paymentUrl: link.checkoutUrl,
            transactionId: link.paymentLinkId,
          },
        },
        { new: true },
      );
      if (!updated) throw new ConflictException('Trạng thái thanh toán đã thay đổi');
      return updated;
    } catch (error) {
      await this.paymentModel.updateOne(
        { _id: payment._id, status: PaymentStatus.PROCESSING, orderCode },
        {
          $set: {
            status: PaymentStatus.FAILED,
            failedAt: new Date(),
            failureReason: error instanceof Error ? error.message.slice(0, 250) : 'payOS error',
          },
        },
      );
      throw error;
    }
  }

  async handlePayOSWebhook(payload: unknown) {
    const webhook = await this.payOS.verifyWebhook(payload);
    if (!webhook.success || webhook.code !== '00' || webhook.data.code !== '00') {
      return { code: '00', desc: 'Webhook acknowledged' };
    }

    const known = await this.paymentModel.exists({ orderCode: webhook.data.orderCode });
    // payOS sends a signed sample while registering the webhook.
    if (!known) return { code: '00', desc: 'Webhook verified' };

    const session = await this.connection.startSession();
    try {
      await session.withTransaction(async () => {
        const payment = await this.paymentModel
          .findOne({ orderCode: webhook.data.orderCode })
          .session(session);
        if (!payment || payment.status === PaymentStatus.COMPLETED) return;
        if (payment.amount !== webhook.data.amount) {
          throw new BadRequestException('Số tiền webhook payOS không khớp đơn hàng');
        }

        await this.paymentModel.updateOne(
          { _id: payment._id, status: { $ne: PaymentStatus.COMPLETED } },
          {
            $set: {
              status: PaymentStatus.COMPLETED,
              paidAt: new Date(),
              transactionId: webhook.data.paymentLinkId || payment.transactionId,
              metadata: JSON.stringify(this.safeWebhookMetadata(webhook)),
            },
            $unset: { failedAt: 1, failureReason: 1 },
          },
          { session },
        );

        const booking = await this.bookingModel.findById(payment.bookingId).session(session);
        if (!booking) return;
        if (booking.status === BookingStatus.PENDING_PAYMENT) {
          const expired = Boolean(booking.holdExpiresAt && booking.holdExpiresAt <= new Date());
          await this.bookingModel.updateOne(
            { _id: booking._id, status: BookingStatus.PENDING_PAYMENT },
            expired
              ? {
                  $set: {
                    status: BookingStatus.CANCEL_REQUESTED,
                    paymentMethod: PaymentMethod.PAYOS,
                    cancelReason: 'PAYMENT_AFTER_HOLD_EXPIRED',
                    refundAmount: payment.amount,
                  },
                }
              : {
                  $set: {
                    status: BookingStatus.CONFIRMED,
                    paymentMethod: PaymentMethod.PAYOS,
                  },
                  $unset: { holdExpiresAt: 1 },
                },
            { session },
          );
          await this.connection.db!.collection('notifications').insertOne(
            {
              userId: booking.userId,
              title: expired ? 'Thanh toán cần hỗ trợ' : 'Thanh toán thành công',
              message: expired
                ? `${booking.hotelName || 'Hotelia'}: giao dịch đến sau khi giữ phòng hết hạn. Bộ phận hỗ trợ sẽ xử lý hoàn tiền.`
                : `${booking.hotelName || 'Hotelia'}: đặt phòng đã được xác nhận qua payOS.`,
              type: 'PAYMENT',
              relatedId: booking._id,
              isRead: false,
              createdAt: new Date(),
            },
            { session },
          );
        }
      });
    } finally {
      await session.endSession();
    }
    return { code: '00', desc: 'success' };
  }

  async findById(id: string): Promise<PaymentDocument> {
    const payment = await this.paymentModel.findById(id);
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  async findByBooking(bookingId: string): Promise<PaymentDocument | null> {
    return this.paymentModel.findOne({ bookingId: this.objectId(bookingId, 'Mã đặt phòng không hợp lệ') });
  }

  async findByUser(userId: string): Promise<PaymentDocument[]> {
    return this.paymentModel
      .find({ userId: this.objectId(userId, 'Tài khoản không hợp lệ') })
      .sort({ createdAt: -1 });
  }

  async cancelPendingCheckout(bookingId: string): Promise<void> {
    const payment = await this.paymentModel.findOne({
      bookingId: this.objectId(bookingId, 'Mã đặt phòng không hợp lệ'),
      status: PaymentStatus.PENDING,
    });
    if (!payment) return;
    await this.payOS.cancelPaymentLink(payment.orderCode, 'Customer cancelled the booking');
    await this.paymentModel.updateOne(
      { _id: payment._id, status: PaymentStatus.PENDING },
      {
        $set: {
          status: PaymentStatus.CANCELLED,
          failedAt: new Date(),
          failureReason: 'BOOKING_CANCELLED',
        },
      },
    );
  }

  async refund(): Promise<never> {
    throw new ServiceUnavailableException(
      'Hoàn tiền tự động chưa được payOS cấu hình; cần xử lý tại ngân hàng và đối soát thủ công',
    );
  }

  private async reuseExisting(payment: PaymentDocument): Promise<PaymentDocument | null> {
    if (payment.status === PaymentStatus.COMPLETED) return payment;
    if (payment.status === PaymentStatus.PENDING && payment.paymentUrl) return payment;
    if (payment.status !== PaymentStatus.PROCESSING) return null;

    try {
      const link = await this.payOS.getPaymentLink(payment.orderCode);
      if (!link?.checkoutUrl) {
        throw new ConflictException('Thanh toán đang được xử lý. Vui lòng thử lại');
      }
      const recovered = await this.paymentModel.findOneAndUpdate(
        { _id: payment._id, status: PaymentStatus.PROCESSING },
        {
          $set: {
            status: PaymentStatus.PENDING,
            paymentUrl: link.checkoutUrl,
            transactionId: link.paymentLinkId,
          },
        },
        { new: true },
      );
      return recovered || payment;
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      throw new ConflictException('Đang đối soát thanh toán payOS. Vui lòng thử lại');
    }
  }

  private newOrderCode(): number {
    return Date.now() * 1000 + randomInt(0, 1000);
  }

  private objectId(value: string, message: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(value)) throw new BadRequestException(message);
    return new Types.ObjectId(value);
  }

  private isDuplicateKey(error: unknown): boolean {
    return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 11000);
  }

  private safeWebhookMetadata(webhook: PayOSWebhookPayload) {
    return {
      reference: webhook.data.reference,
      transactionDateTime: webhook.data.transactionDateTime,
      code: webhook.data.code,
      desc: webhook.data.desc,
    };
  }
}
