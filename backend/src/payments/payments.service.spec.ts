import { PaymentsService } from './payments.service';
import { PaymentMethod } from './schemas/payment.schema';

describe('payments without a configured gateway', () => {
  it('does not create, confirm, or refund a payment record', async () => {
    const paymentModel = {
      create: jest.fn(),
      findOne: jest.fn(),
      findById: jest.fn(),
    };
    const service = new PaymentsService(paymentModel as any);
    await expect(service.create('guest', {
      bookingId: '507f1f77bcf86cd799439011', method: PaymentMethod.MOMO,
      returnUrl: 'https://example.com/return',
    })).rejects.toThrow('chưa được cấu hình');
    await expect(service.confirm('unverified-transaction')).rejects.toThrow('chưa được cấu hình');
    await expect(service.refund('unverified-payment')).rejects.toThrow('chưa được cấu hình');
    expect(paymentModel.create).not.toHaveBeenCalled();
    expect(paymentModel.findOne).not.toHaveBeenCalled();
    expect(paymentModel.findById).not.toHaveBeenCalled();
  });
});
