import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  APIError,
  ConnectionTimeoutError,
  InvalidSignatureError,
  NotFoundError,
  PayOS,
  type Webhook,
  type WebhookData,
} from '@payos/node';

export interface CreatePayOSPaymentInput {
  orderCode: number;
  amount: number;
  description: string;
  returnUrl: string;
  cancelUrl: string;
  expiredAt: number;
  itemName: string;
}

export interface PayOSPaymentLink {
  checkoutUrl: string;
  paymentLinkId: string;
  orderCode: number;
  amount: number;
  status?: string;
}

export type PayOSWebhookData = WebhookData;
export type PayOSWebhookPayload = Webhook;

@Injectable()
export class PayOSClient {
  private client?: PayOS;

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return ['PAYOS_CLIENT_ID', 'PAYOS_API_KEY', 'PAYOS_CHECKSUM_KEY'].every(
      (key) => Boolean(this.config.get<string>(key)?.trim()),
    );
  }

  get returnUrl(): string {
    return this.config.get<string>('PAYOS_RETURN_URL')?.trim() || 'hotelia://payment/success';
  }

  get cancelUrl(): string {
    return this.config.get<string>('PAYOS_CANCEL_URL')?.trim() || 'hotelia://payment/cancel';
  }

  async createPaymentLink(input: CreatePayOSPaymentInput): Promise<PayOSPaymentLink> {
    try {
      const link = await this.getClient().paymentRequests.create({
        orderCode: input.orderCode,
        amount: input.amount,
        description: input.description,
        returnUrl: input.returnUrl,
        cancelUrl: input.cancelUrl,
        expiredAt: input.expiredAt,
        items: [{ name: input.itemName.slice(0, 100), quantity: 1, price: input.amount }],
      });
      return link;
    } catch (error) {
      this.raiseGatewayError(error, 'Không thể tạo liên kết thanh toán payOS');
    }
  }

  async getPaymentLink(orderCode: number): Promise<PayOSPaymentLink | null> {
    try {
      const link = await this.getClient().paymentRequests.get(orderCode);
      return {
        checkoutUrl: `https://pay.payos.vn/web/${link.id}`,
        paymentLinkId: link.id,
        orderCode: link.orderCode,
        amount: link.amount,
        status: link.status,
      };
    } catch (error) {
      if (error instanceof NotFoundError) return null;
      this.raiseGatewayError(error, 'Không thể đối soát liên kết payOS');
    }
  }

  async cancelPaymentLink(orderCode: number, reason: string): Promise<void> {
    try {
      await this.getClient().paymentRequests.cancel(orderCode, reason.slice(0, 160));
    } catch (error) {
      if (error instanceof NotFoundError) return;
      this.raiseGatewayError(error, 'Không thể hủy liên kết payOS');
    }
  }

  async verifyWebhook(payload: unknown): Promise<PayOSWebhookPayload> {
    if (!payload || typeof payload !== 'object') {
      throw new BadRequestException('Webhook payOS không hợp lệ');
    }
    const candidate = payload as Partial<Webhook>;
    if (!candidate.data || typeof candidate.signature !== 'string') {
      throw new BadRequestException('Webhook payOS thiếu dữ liệu hoặc chữ ký');
    }
    const client = this.getClient();
    try {
      const verifiedData = await client.webhooks.verify(candidate as Webhook);
      return { ...candidate, data: verifiedData } as Webhook;
    } catch (error) {
      if (error instanceof InvalidSignatureError) {
        throw new BadRequestException('Chữ ký webhook payOS không hợp lệ');
      }
      throw new BadRequestException('Webhook payOS không hợp lệ');
    }
  }

  private getClient(): PayOS {
    if (this.client) return this.client;
    const clientId = this.config.get<string>('PAYOS_CLIENT_ID')?.trim();
    const apiKey = this.config.get<string>('PAYOS_API_KEY')?.trim();
    const checksumKey = this.config.get<string>('PAYOS_CHECKSUM_KEY')?.trim();
    if (!clientId || !apiKey || !checksumKey) {
      throw new ServiceUnavailableException('Kênh thanh toán payOS chưa được cấu hình');
    }
    this.client = new PayOS({
      clientId,
      apiKey,
      checksumKey,
      timeout: 10_000,
      maxRetries: 2,
      logLevel: 'off',
    });
    return this.client;
  }

  private raiseGatewayError(error: unknown, fallback: string): never {
    if (error instanceof ConnectionTimeoutError) {
      throw new BadGatewayException('payOS không phản hồi trong thời gian cho phép');
    }
    if (error instanceof APIError && error.status && error.status < 500 && error.status !== 429) {
      throw new BadGatewayException(error.desc || fallback);
    }
    throw new BadGatewayException(`${fallback}. Vui lòng thử lại`);
  }
}
