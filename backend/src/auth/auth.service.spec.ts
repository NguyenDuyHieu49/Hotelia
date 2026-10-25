import { createHash } from 'node:crypto';
import { Types } from 'mongoose';
import { jwtVerify } from 'jose';
import { AuthService } from './auth.service';

jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(() => jest.fn()),
  jwtVerify: jest.fn(),
}));

describe('verified social sign-in', () => {
  const verify = jwtVerify as jest.Mock;
  const user = { _id: new Types.ObjectId(), email: 'guest@gmail.com', name: 'Guest', role: 'USER', isActive: true };
  const users = {
    findOrCreateSocialUser: jest.fn(async () => user),
    updateRefreshToken: jest.fn(async () => undefined),
  };
  const jwt = { signAsync: jest.fn(async () => 'signed-token') };
  const config = { get: jest.fn((key: string) => ({
    GOOGLE_IOS_CLIENT_ID: 'ios-client-id', APPLE_BUNDLE_ID: 'app.bundle', JWT_SECRET: 'secret',
  })[key]) };
  const service = new AuthService(users as any, jwt as any, config as any);
  const base = { provider: 'google' as const, idToken: 'x'.repeat(30) };

  beforeEach(() => jest.clearAllMocks());

  it('rejects a token that fails signature, audience or expiry verification', async () => {
    verify.mockRejectedValueOnce(new Error('invalid signature'));
    await expect(service.social(base)).rejects.toThrow('ID token không hợp lệ');
    expect(users.findOrCreateSocialUser).not.toHaveBeenCalled();
  });

  it('creates a Hotelia session only from a verified Google subject and email', async () => {
    verify.mockResolvedValueOnce({ payload: { sub: 'google-sub', email: user.email, email_verified: true, name: 'Guest' } });
    const result = await service.social(base);
    expect(verify).toHaveBeenCalledWith(base.idToken, expect.any(Function),
      expect.objectContaining({ audience: 'ios-client-id', algorithms: ['RS256'] }));
    expect(users.findOrCreateSocialUser).toHaveBeenCalledWith('google', 'google-sub', user.email, 'Guest', true);
    expect(result.accessToken).toBe('signed-token');
  });

  it('does not trust unverified or non-authoritative Google email for linking', async () => {
    verify.mockResolvedValueOnce({ payload: { sub: 'google-sub', email: 'guest@example.com', email_verified: false } });
    await expect(service.social(base)).rejects.toThrow('chưa xác nhận email');
    expect(users.findOrCreateSocialUser).not.toHaveBeenCalled();

    verify.mockResolvedValueOnce({ payload: { sub: 'google-sub', email: 'guest@example.com', email_verified: true } });
    await service.social(base);
    expect(users.findOrCreateSocialUser).toHaveBeenCalledWith('google', 'google-sub',
      'guest@example.com', '', false);
  });

  it('requires the Apple identity token nonce to match this attempt', async () => {
    verify.mockResolvedValueOnce({ payload: { sub: 'apple-sub', email: 'guest@privaterelay.appleid.com',
      email_verified: 'true', nonce: 'different' } });
    await expect(service.social({ provider: 'apple', idToken: base.idToken, nonce: 'raw-random-nonce' }))
      .rejects.toThrow('không khớp');
    expect(users.findOrCreateSocialUser).not.toHaveBeenCalled();

    const nonce = 'raw-random-nonce';
    verify.mockResolvedValueOnce({ payload: { sub: 'apple-sub', email: 'guest@privaterelay.appleid.com',
      email_verified: 'true', nonce: createHash('sha256').update(nonce).digest('hex') } });
    await service.social({ provider: 'apple', idToken: base.idToken, nonce, name: 'Guest' });
    expect(users.findOrCreateSocialUser).toHaveBeenCalledWith('apple', 'apple-sub',
      'guest@privaterelay.appleid.com', 'Guest', true);
  });
});

describe('token types', () => {
  const user = { _id: new Types.ObjectId(), email: 'guest@example.com', name: 'Guest', role: 'USER', isActive: true, tokenVersion: 0 };
  const config = { get: jest.fn((key: string, fallback?: string) => ({ JWT_SECRET: 'secret' } as Record<string, string>)[key] ?? fallback) };

  it('signs access and refresh tokens with distinct types', async () => {
    const jwt = { signAsync: jest.fn(async (payload: { typ: string }) => payload.typ) };
    const users = { findByEmail: jest.fn(async () => user), validatePassword: jest.fn(async () => true), updateRefreshToken: jest.fn() };
    const result = await new AuthService(users as any, jwt as any, config as any).login({ email: user.email, password: 'x' } as any);
    expect(result.accessToken).toBe('access');
    expect(result.refreshToken).toBe('refresh');
  });

  it('refuses to refresh a session with an access token', async () => {
    const jwt = { verify: jest.fn(() => ({ sub: String(user._id), typ: 'access' })), signAsync: jest.fn() };
    const users = { validateRefreshToken: jest.fn(async () => true), findById: jest.fn(async () => user), updateRefreshToken: jest.fn() };
    await expect(new AuthService(users as any, jwt as any, config as any).refresh('token')).rejects.toThrow('Invalid refresh token');
    expect(users.validateRefreshToken).not.toHaveBeenCalled();
  });

  it('revokes the refresh token it is given, even without a valid access token', async () => {
    const jwt = { verify: jest.fn(() => ({ sub: String(user._id), typ: 'refresh' })) };
    const users = { validateRefreshToken: jest.fn(async () => true), updateRefreshToken: jest.fn() };
    await new AuthService(users as any, jwt as any, config as any).logout('refresh-token');
    expect(users.validateRefreshToken).toHaveBeenCalledWith(String(user._id), 'refresh-token');
    expect(users.updateRefreshToken).toHaveBeenCalledWith(String(user._id), null);
  });

  it('answers logout the same way for access, stale or forged tokens without revoking', async () => {
    const users = { validateRefreshToken: jest.fn(async () => false), updateRefreshToken: jest.fn() };
    const access = { verify: jest.fn(() => ({ sub: String(user._id), typ: 'access' })) };
    const stale = { verify: jest.fn(() => ({ sub: String(user._id), typ: 'refresh' })) };
    const forged = { verify: jest.fn(() => { throw new Error('invalid signature'); }) };
    for (const jwt of [access, stale, forged]) {
      await expect(new AuthService(users as any, jwt as any, config as any).logout('t'))
        .resolves.toEqual({ message: 'Logged out successfully' });
    }
    expect(users.updateRefreshToken).not.toHaveBeenCalled();
  });
});
