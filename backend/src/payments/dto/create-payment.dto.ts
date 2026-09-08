import { IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from '../../schemas/payment.schema';

export class CreatePaymentDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsString()
  bookingId: string;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.MOMO })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty({ example: 'http://localhost:3000/payment/return' })
  @IsString()
  returnUrl: string;
}
