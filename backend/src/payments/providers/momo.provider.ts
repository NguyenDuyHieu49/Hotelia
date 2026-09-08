import { Injectable } from '@nestjs/common';
import { PaymentProvider, PaymentRequest, PaymentResponse } from './payment-provider.interface';
import { PaymentMethod } from '../../schemas/payment.schema';

@Injectable()
export class MoMoProvider implements PaymentProvider {
  method = PaymentMethod.MOMO;

  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    // Mock MoMo payment - in production, call MoMo API
    const transactionId = `MOMO_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      success: true,
      transactionId,
      paymentUrl: `https://momo.vn/pay?transactionId=${transactionId}&amount=${request.amount}`,
      message: 'MoMo payment initiated',
    };
  }

  async verifyPayment(transactionId: string): Promise<{ success: boolean; message?: string }> {
    // Mock verification - always returns success
    return { success: true, message: 'Payment verified' };
  }

  async refund(transactionId: string, amount: number): Promise<PaymentResponse> {
    // Mock refund
    return {
      success: true,
      transactionId: `REFUND_${transactionId}`,
      message: 'Refund initiated',
    };
  }
}
