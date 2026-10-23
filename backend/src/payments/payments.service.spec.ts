import { Types } from 'mongoose';
import { BookingStatus } from '../bookings/schemas/booking.schema';
import { PaymentsService } from './payments.service';
import { PaymentMethod, PaymentStatus } from './schemas/payment.schema';

describe('PaymentsService', () => {
  const bookingId = new Types.ObjectId();
  const userId = new Types.ObjectId();

  function fixture(overrides: Record<string, unknown> = {}) {
    const paymentModel = {
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      create: jest.fn(),
      updateOne: jest.fn(),
      exists: jest.fn(),
      findById: jest.fn(),
      find: jest.fn(),
      ...overrides.paymentModel as object,
    };
    const bookingModel = {
      findOne: jest.fn(),
      updateOne: jest.fn(),
      findById: jest.fn(),
      exists: jest.fn(),
      ...overrides.bookingModel as object,
    };
    const connection = {
      startSession: jest.fn(),
      db: { collection: jest.fn() },
      ...overrides.connection as object,
    };
    const payOS = {
      isConfigured: jest.fn(() => true),
      returnUrl: 'hotelia://payment/success',
      cancelUrl: 'hotelia://payment/cancel',
      createPaymentLink: jest.fn(),
      getPaymentLink: jest.fn(),
      verifyWebhook: jest.fn(),
      ...overrides.payOS as object,
    };
    return {
      service: new PaymentsService(
        paymentModel as any,
        bookingModel as any,
        connection as any,
        payOS as any,
      ),
      paymentModel,
      bookingModel,
      payOS,
    };
  }

  it('fails closed before reading a booking when payOS is not configured', async () => {
    const { service, bookingModel } = fixture({ payOS: { isConfigured: jest.fn(() => false) } });
    await expect(service.create(String(userId), {
      bookingId: String(bookingId),
      method: PaymentMethod.PAYOS,
    })).rejects.toThrow('chưa được cấu hình');
    expect(bookingModel.findOne).not.toHaveBeenCalled();
  });

  it('reuses an active checkout instead of creating a duplicate payment', async () => {
    const activePayment = {
      _id: new Types.ObjectId(),
      bookingId,
      userId,
      status: PaymentStatus.PENDING,
      paymentUrl: 'https://pay.payos.vn/web/existing',
    };
    const { service, paymentModel, bookingModel, payOS } = fixture();
    bookingModel.findOne.mockResolvedValue({
      _id: bookingId,
      userId,
      status: BookingStatus.PENDING_PAYMENT,
      totalPrice: 500_000,
      holdExpiresAt: new Date(Date.now() + 60_000),
    });
    paymentModel.findOne.mockResolvedValue(activePayment);

    await expect(service.create(String(userId), {
      bookingId: String(bookingId),
      method: PaymentMethod.PAYOS,
    })).resolves.toBe(activePayment);
    expect(payOS.createPaymentLink).not.toHaveBeenCalled();
    expect(paymentModel.create).not.toHaveBeenCalled();
  });

  it('uses the trusted booking total and persists the returned payOS link', async () => {
    const paymentId = new Types.ObjectId();
    const draft = { _id: paymentId, orderCode: 1 };
    const completedDraft = {
      ...draft,
      status: PaymentStatus.PENDING,
      paymentUrl: 'https://pay.payos.vn/web/new',
    };
    const { service, paymentModel, bookingModel, payOS } = fixture();
    bookingModel.findOne.mockResolvedValue({
      _id: bookingId,
      userId,
      status: BookingStatus.PENDING_PAYMENT,
      totalPrice: 750_000,
      hotelName: 'Hotelia Test',
      holdExpiresAt: new Date(Date.now() + 5 * 60_000),
    });
    paymentModel.findOne.mockResolvedValue(null);
    paymentModel.create.mockResolvedValue(draft);
    bookingModel.exists.mockResolvedValue({ _id: bookingId });
    payOS.createPaymentLink.mockResolvedValue({
      checkoutUrl: completedDraft.paymentUrl,
      paymentLinkId: 'link-id',
    });
    paymentModel.findOneAndUpdate.mockResolvedValue(completedDraft);

    await expect(service.create(String(userId), {
      bookingId: String(bookingId),
      method: PaymentMethod.PAYOS,
    })).resolves.toBe(completedDraft);
    expect(paymentModel.create).toHaveBeenCalledWith(expect.objectContaining({ amount: 750_000 }));
    expect(payOS.createPaymentLink).toHaveBeenCalledWith(expect.objectContaining({ amount: 750_000 }));
  });

  it('acknowledges a valid registration sample without mutating bookings', async () => {
    const sample = {
      code: '00',
      success: true,
      data: { orderCode: 123, amount: 1000, code: '00' },
    };
    const { service, paymentModel, payOS } = fixture();
    payOS.verifyWebhook.mockReturnValue(sample);
    paymentModel.exists.mockResolvedValue(null);
    await expect(service.handlePayOSWebhook(sample)).resolves.toEqual({
      code: '00',
      desc: 'Webhook verified',
    });
  });
});
