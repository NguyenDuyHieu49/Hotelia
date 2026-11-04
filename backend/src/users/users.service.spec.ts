import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import { Types } from 'mongoose';
import { UsersService } from './users.service';

describe('refresh token storage', () => {
  const id = new Types.ObjectId();
  const claims = { sub: String(id), email: 'guest@example.com', role: 'USER', tokenVersion: 0, typ: 'refresh' };
  // Two refresh tokens of one user differ only after byte 72, where bcrypt stops reading.
  const older = jwt.sign({ ...claims, n: 1 }, 'secret', { expiresIn: '7d' });
  const newer = jwt.sign({ ...claims, n: 2 }, 'secret', { expiresIn: '7d' });
  const user: any = { _id: id, save: jest.fn(async () => user) };
  const service = new UsersService({ findById: jest.fn(async () => user) } as any);

  it('rejects the previous refresh token after rotation', async () => {
    expect(older.slice(0, 72)).toBe(newer.slice(0, 72));
    await service.updateRefreshToken(String(id), older);
    await service.updateRefreshToken(String(id), newer);
    expect(user.refreshToken).toMatch(/^sha256:[0-9a-f]{64}$/);
    await expect(service.validateRefreshToken(String(id), newer)).resolves.toBe(true);
    await expect(service.validateRefreshToken(String(id), older)).resolves.toBe(false);
  });

  it('rejects every token once the session is revoked', async () => {
    await service.updateRefreshToken(String(id), newer);
    await service.updateRefreshToken(String(id), null);
    await expect(service.validateRefreshToken(String(id), newer)).resolves.toBe(false);
  });

  it('still accepts a session stored as bcrypt before the digest change', async () => {
    user.refreshToken = await bcrypt.hash(newer, 4);
    user.refreshTokenExpiry = new Date(Date.now() + 60_000);
    await expect(service.validateRefreshToken(String(id), newer)).resolves.toBe(true);
  });
});

describe('login lockout', () => {
  const makeUser = async () => {
    const user: any = { passwordHash: await bcrypt.hash('Correct123', 4), loginAttempts: 0 };
    user.save = jest.fn(async () => user);
    return user;
  };
  const service = new UsersService({} as any);

  it('locks the account for 15 minutes after five wrong passwords', async () => {
    const user = await makeUser();
    for (let i = 0; i < 4; i++) await expect(service.validatePassword(user, 'Wrong1234')).resolves.toBe(false);
    expect(user.lockedUntil).toBeUndefined();
    await expect(service.validatePassword(user, 'Wrong1234')).resolves.toBe(false);
    const minutes = (user.lockedUntil.getTime() - Date.now()) / 60_000;
    expect(minutes).toBeGreaterThan(14);
    expect(minutes).toBeLessThanOrEqual(15);
  });

  it('rejects even the right password while the account is locked', async () => {
    const user = await makeUser();
    user.lockedUntil = new Date(Date.now() + 60_000);
    await expect(service.validatePassword(user, 'Correct123')).rejects.toThrow('Account is temporarily locked');
  });

  it('resets the failure counter after a successful login', async () => {
    const user = await makeUser();
    await service.validatePassword(user, 'Wrong1234');
    await service.validatePassword(user, 'Wrong1234');
    await expect(service.validatePassword(user, 'Correct123')).resolves.toBe(true);
    expect(user.loginAttempts).toBe(0);
    expect(user.lockedUntil).toBeUndefined();
  });
});
