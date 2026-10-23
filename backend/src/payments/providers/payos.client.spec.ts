import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import { PayOSClient } from './payos.client';

describe('PayOSClient webhook verification', () => {
  const checksumKey = 'test-checksum-key';
  const config = new ConfigService({
    PAYOS_CLIENT_ID: 'client',
    PAYOS_API_KEY: 'api',
    PAYOS_CHECKSUM_KEY: checksumKey,
  });
  const client = new PayOSClient(config);
  const data = {
    amount: 500000,
    code: '00',
    desc: 'Thành công',
    orderCode: 123456,
    paymentLinkId: 'payment-link',
    reference: 'bank-reference',
  };
  const canonical = Object.keys(data)
    .sort()
    .map((key) => `${key}=${data[key as keyof typeof data]}`)
    .join('&');
  const signature = createHmac('sha256', checksumKey).update(canonical).digest('hex');

  it('accepts a webhook signed with the channel checksum key', async () => {
    await expect(client.verifyWebhook({
      code: '00', desc: 'success', success: true, data, signature,
    })).resolves.toEqual(expect.objectContaining({ data: expect.objectContaining({ orderCode: 123456 }) }));
  });

  it('rejects a changed amount with the original signature', async () => {
    await expect(client.verifyWebhook({
      code: '00', desc: 'success', success: true,
      data: { ...data, amount: 1 }, signature,
    })).rejects.toThrow(BadRequestException);
  });
});
