  private async generateTokens(user: UserDocument) {
    const payload: JwtPayload = { sub: user._id.toString(), email: user.email, role: user.role, tokenVersion:user.tokenVersion || 0 };
    const accessLifetime = this.configService.get<string>('JWT_EXPIRES_IN', '15m') as JwtSignOptions['expiresIn'];
    const refreshLifetime = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d') as JwtSignOptions['expiresIn'];
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync({ ...payload, typ: 'access' }, {
        secret: this.configService.get<string>('JWT_SECRET')!,
        expiresIn: accessLifetime,
      }),
      this.jwtService.signAsync({ ...payload, typ: 'refresh' }, {
        secret: this.configService.get<string>('JWT_SECRET')!,
        expiresIn: refreshLifetime,
      }),
    ]);
    return { accessToken, refreshToken };
  }
