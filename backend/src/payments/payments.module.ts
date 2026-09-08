import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { Payment, PaymentSchema } from './schemas/payment.schema';
import { MoMoProvider } from './providers/momo.provider';
import { VNPayProvider } from './providers/vnpay.provider';
import { BankTransferProvider } from './providers/bank-transfer.provider';
import { CODProvider } from './providers/cod.provider';
import { BookingsModule } from '../bookings/bookings.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Payment.name, schema: PaymentSchema }]),
    BookingsModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, MoMoProvider, VNPayProvider, BankTransferProvider, CODProvider],
  exports: [PaymentsService],
})
export class PaymentsModule {}
