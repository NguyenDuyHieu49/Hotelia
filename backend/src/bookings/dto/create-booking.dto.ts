import { IsString, IsNumber, IsOptional, Min, Max, IsDateString, MinLength, IsEmail, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsString()
  hotelId: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439012' })
  @IsString()
  roomTypeId: string;

  @ApiProperty({ example: '2026-09-10' })
  @IsDateString()
  checkIn: string;

  @ApiProperty({ example: '2026-09-12' })
  @IsDateString()
  checkOut: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(1)
  @Max(10)
  guestCount: number;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  guestName: string;

  @ApiProperty()
  @IsEmail()
  guestEmail: string;

  @ApiProperty()
  @IsString()
  @Matches(/^[+]?[0-9]{10,15}$/)
  guestPhone: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  specialRequests?: string;
}
