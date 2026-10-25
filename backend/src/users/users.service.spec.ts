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
