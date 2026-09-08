import { Injectable } from '@nestjs/common';
import { PaymentProvider, PaymentRequest, PaymentResponse } from './payment-provider.interface';
import { PaymentMethod } from '../../schemas/payment.schema';

@Injectable()
export class CODProvider implements PaymentProvider {
  method = PaymentMethod.CASH_ON_DELIVERY;

  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    // COD - no online payment needed
    const transactionId = `COD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      success: true,
      transactionId,
      paymentUrl: undefined,
      message: 'Cash on Delivery selected. Payment will be collected at check-in.',
    };
  }

  async verifyPayment(transactionId: string): Promise<{ success: boolean; message?: string }> {
    // COD verified at check-in
    return { success: true, message: 'COD - payment at check-in' };
  }

  async refund(transactionId: string, amount: number): Promise<PaymentResponse> {
    return {
      success: true,
      transactionId: `REFUND_${transactionId}`,
      message: 'No refund needed for COD',
    };
  }
}
