import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET')!,
    });
  }

  async validate(payload: any) {
    // A 7-day refresh token must not authorize API calls in place of a 15-minute access token.
    if (payload.typ === 'refresh') throw new UnauthorizedException('Refresh token cannot access the API');
    const user = await this.usersService.findById(payload.sub);
    if (!user.isActive) throw new UnauthorizedException('Account deactivated');
    if((payload.tokenVersion || 0)!==(user.tokenVersion || 0)) throw new UnauthorizedException('Password changed');
    return { sub: payload.sub, email: user.email, role: user.role };
  }
}
