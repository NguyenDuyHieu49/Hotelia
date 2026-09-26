import { IsString, IsNumber, IsInt, IsArray, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRoomTypeDto {
  @ApiProperty({ example: 'Standard Room' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Phòng tiêu chuẩn với đầy đủ tiện nghi' })
  @IsString()
  description: string;

  @ApiProperty({ example: 500000 })
  @IsNumber()
  @Min(1)
  basePrice: number;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  maxGuests: number;

  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(1)
  totalRooms: number;

  @ApiProperty({ example: ['wifi', 'tv', 'ac'], required: false })
  @IsArray()
  @IsString({each:true})
  @IsOptional()
  amenities?: string[];

  @ApiProperty({ example: [], required: false })
  @IsArray()
  @IsString({each:true})
  @IsOptional()
  images?: string[];
}
