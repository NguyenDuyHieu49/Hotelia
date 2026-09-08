import { Injectable } from '@nestjs/common';
import { PaymentProvider, PaymentRequest, PaymentResponse } from './payment-provider.interface';
import { PaymentMethod } from '../../schemas/payment.schema';

@Injectable()
export class VNPayProvider implements PaymentProvider {
  method = PaymentMethod.VNPAY;

  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    // Mock VNPay payment - in production, call VNPay API
    const transactionId = `VNPAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      success: true,
      transactionId,
      paymentUrl: `https://vnpay.vn/pay?transactionId=${transactionId}&amount=${request.amount}`,
      message: 'VNPay payment initiated',
    };
  }

  async verifyPayment(transactionId: string): Promise<{ success: boolean; message?: string }> {
    // Mock verification
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
