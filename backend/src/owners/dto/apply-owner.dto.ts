import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ApplyOwnerDto {
  @ApiProperty({ example: 'My Hotel Business' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  businessName: string;

  @ApiProperty({ example: 'BUS-123456' })
  @IsString()
  @IsOptional()
  businessLicense?: string;
}
