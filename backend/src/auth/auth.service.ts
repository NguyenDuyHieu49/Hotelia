import { Injectable, UnauthorizedException, ServiceUnavailableException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { UserDocument } from '../users/schemas/user.schema';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { SocialLoginDto } from './dto/social-login.dto';

const googleKeys = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
const appleKeys = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const user = await this.usersService.create(dto);
    const tokens = await this.generateTokens(user);
    await this.usersService.updateRefreshToken(user._id.toString(), tokens.refreshToken);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await this.usersService.validatePassword(user, dto.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    if (!user.isActive) throw new UnauthorizedException('Account deactivated');

    const tokens = await this.generateTokens(user);
    await this.usersService.updateRefreshToken(user._id.toString(), tokens.refreshToken);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async social(dto: SocialLoginDto) {
    const clientId = dto.provider === 'google'
      ? this.configService.get<string>('GOOGLE_IOS_CLIENT_ID')
      : this.configService.get<string>('APPLE_BUNDLE_ID');
    if (!clientId) throw new ServiceUnavailableException('Đăng nhập qua nhà cung cấp chưa được cấu hình');
    let claims: JWTPayload;
    try {
      const verified = await jwtVerify(dto.idToken, dto.provider === 'google' ? googleKeys : appleKeys, {
        audience: clientId,
        issuer: dto.provider === 'google' ? ['accounts.google.com', 'https://accounts.google.com'] : 'https://appleid.apple.com',
        algorithms: ['RS256'],
      });
      claims = verified.payload;
    } catch {
      throw new UnauthorizedException('ID token không hợp lệ hoặc đã hết hạn');
    }
    const sub = claims.sub;
    const email = claims.email;
    const verifiedEmail = claims.email_verified === true || claims.email_verified === 'true';
    if (!sub || typeof email !== 'string' || !verifiedEmail) {
      throw new UnauthorizedException('Nhà cung cấp chưa xác nhận email');
    }
    if (dto.provider === 'apple') {
      if (!dto.nonce) throw new UnauthorizedException('Thiếu mã xác thực Apple');
      const expected = createHash('sha256').update(dto.nonce).digest('hex');
      if (claims.nonce !== expected) throw new UnauthorizedException('Mã xác thực Apple không khớp');
    }
    const authoritativeGoogle = email.toLowerCase().endsWith('@gmail.com') ||
      (typeof claims.hd === 'string' && claims.hd.length > 0);
    const canLinkEmail = dto.provider === 'apple' || authoritativeGoogle;
    const displayName = dto.provider === 'google' && typeof claims.name === 'string'
      ? claims.name : dto.name ?? '';
    const user = await this.usersService.findOrCreateSocialUser(dto.provider, sub, email, displayName, canLinkEmail);
    if (!user.isActive) throw new UnauthorizedException('Account deactivated');
    const tokens = await this.generateTokens(user);
    await this.usersService.updateRefreshToken(user._id.toString(), tokens.refreshToken);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const valid = await this.usersService.validateRefreshToken(payload.sub, refreshToken);
      if (!valid) throw new UnauthorizedException('Invalid refresh token');

      const user = await this.usersService.findById(payload.sub);
      if (!user.isActive) throw new UnauthorizedException('Account deactivated');

      const tokens = await this.generateTokens(user);
      await this.usersService.updateRefreshToken(user._id.toString(), tokens.refreshToken);
      return { user: this.sanitizeUser(user), ...tokens };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string) {
    await this.usersService.updateRefreshToken(userId, null);
    return { message: 'Logged out successfully' };
  }

  private async generateTokens(user: UserDocument) {
    const payload: JwtPayload = { sub: user._id.toString(), email: user.email, role: user.role, tokenVersion:user.tokenVersion || 0 };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '15m'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
      }),
    ]);
    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: UserDocument) {
    return {
      id: user._id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      avatar: user.avatar,
      role: user.role,
      ownerStatus: user.ownerStatus,
    };
  }
}
