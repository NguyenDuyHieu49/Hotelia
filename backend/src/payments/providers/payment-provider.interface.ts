import { PaymentMethod, PaymentStatus } from '../schemas/payment.schema';

export interface PaymentRequest {
  amount: number;
  bookingId: string;
  returnUrl: string;
  metadata?: Record<string, any>;
}

export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  paymentUrl?: string;
  message?: string;
}

export interface PaymentProvider {
  method: PaymentMethod;
  createPayment(request: PaymentRequest): Promise<PaymentResponse>;
  verifyPayment(transactionId: string): Promise<{ success: boolean; message?: string }>;
  refund(transactionId: string, amount: number): Promise<PaymentResponse>;
}
