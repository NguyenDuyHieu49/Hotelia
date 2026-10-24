import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  const user = { email: 'guest@example.com', role: 'USER', isActive: true, tokenVersion: 0 };
  const strategy = new JwtStrategy({ get: () => 'secret' } as any, { findById: jest.fn(async () => user) } as any);

  it('accepts an access token', async () => {
    await expect(strategy.validate({ sub: 'u1', typ: 'access', tokenVersion: 0 })).resolves.toMatchObject({ sub: 'u1', role: 'USER' });
  });

  it('rejects a refresh token used as a bearer token', async () => {
    await expect(strategy.validate({ sub: 'u1', typ: 'refresh', tokenVersion: 0 })).rejects.toThrow('Refresh token cannot access the API');
  });
});
