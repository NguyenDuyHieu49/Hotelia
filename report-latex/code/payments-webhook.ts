  async handlePayOSWebhook(payload: unknown) {
    const webhook = await this.payOS.verifyWebhook(payload);
    if (!webhook.success || webhook.code !== '00' || webhook.data.code !== '00') {
      return { code: '00', desc: 'Webhook acknowledged' };
    }

    const known = await this.paymentModel.exists({ orderCode: webhook.data.orderCode });
    // payOS sends a signed sample while registering the webhook.
    if (!known) return { code: '00', desc: 'Webhook verified' };

    const session = await this.connection.startSession();
    try {
      await session.withTransaction(async () => {
        const payment = await this.paymentModel
          .findOne({ orderCode: webhook.data.orderCode })
          .session(session);
        if (!payment || payment.status === PaymentStatus.COMPLETED) return;
        if (payment.amount !== webhook.data.amount) {
          throw new BadRequestException('Số tiền webhook payOS không khớp đơn hàng');
        }
