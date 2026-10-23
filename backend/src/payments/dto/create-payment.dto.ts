import { IsMongoId, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from '../schemas/payment.schema';

export class CreatePaymentDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsMongoId()
  bookingId: string;

  @ApiProperty({ enum: [PaymentMethod.PAYOS], example: PaymentMethod.PAYOS })
  @IsIn([PaymentMethod.PAYOS])
  method: PaymentMethod.PAYOS;
}
