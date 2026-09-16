import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ApplyOwnerDto {
  @ApiProperty({ example: 'My Hotel Business' })
  @IsString()
  businessName: string;

  @ApiProperty({ example: 'BUS-123456' })
  @IsString()
  @IsOptional()
  businessLicense?: string;
}
