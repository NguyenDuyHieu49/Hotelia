import { Injectable } from '@nestjs/common';
import { PaymentProvider, PaymentRequest, PaymentResponse } from './payment-provider.interface';
import { PaymentMethod } from '../../schemas/payment.schema';

@Injectable()
export class BankTransferProvider implements PaymentProvider {
  method = PaymentMethod.BANK_TRANSFER;

  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    // Mock bank transfer - return static account info
    const transactionId = `BANK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      success: true,
      transactionId,
      paymentUrl: undefined,
      message: `Bank transfer initiated. Please transfer ${request.amount} VND to account: 1234567890 at Vietcombank`,
    };
  }

  async verifyPayment(transactionId: string): Promise<{ success: boolean; message?: string }> {
    return { success: true, message: 'Pending verification' };
  }

  async refund(transactionId: string, amount: number): Promise<PaymentResponse> {
    return {
      success: true,
      transactionId: `REFUND_${transactionId}`,
      message: 'Refund initiated',
    };
  }
}
