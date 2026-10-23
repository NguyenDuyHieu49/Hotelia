import { validateEnvironment } from './env.validation';

describe('environment validation', () => {
  const base = {
    NODE_ENV: 'development',
    MONGODB_URI: 'mongodb://localhost:27017/hotelia',
    JWT_SECRET: 'local-development-secret',
  };

  it('accepts the local development configuration', () => {
    expect(validateEnvironment({ ...base })).toMatchObject(base);
  });

  it('rejects missing required variables', () => {
    expect(() => validateEnvironment({ NODE_ENV: 'development' }))
      .toThrow('MONGODB_URI, JWT_SECRET');
  });

  it('rejects a placeholder JWT secret in production', () => {
    expect(() => validateEnvironment({
      ...base,
      NODE_ENV: 'production',
      JWT_SECRET: 'dev-secret-key-change-in-production',
      CORS_ORIGINS: 'https://admin.hotelia.example',
    })).toThrow('strong production secret');
  });

  it('requires explicit browser origins in production', () => {
    expect(() => validateEnvironment({
      ...base,
      NODE_ENV: 'production',
      JWT_SECRET: '6b55a508099842f19f4b24773f077069d8528ac1',
    })).toThrow('CORS_ORIGINS');
  });
});
