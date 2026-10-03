import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SocialLoginDto {
  @IsIn(['google', 'apple'])
  provider: 'google' | 'apple';

  @IsString()
  @MinLength(20)
  @MaxLength(8192)
  idToken: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(16)
  @MaxLength(256)
  nonce?: string;
}
