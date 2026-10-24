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
