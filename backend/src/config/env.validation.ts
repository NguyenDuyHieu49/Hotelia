const REQUIRED = ['MONGODB_URI', 'JWT_SECRET'] as const;

export function validateEnvironment(config: Record<string, unknown>) {
  const missing = REQUIRED.filter((key) => {
    const value = config[key];
    return typeof value !== 'string' || value.trim().length === 0;
  });
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  const nodeEnv = String(config.NODE_ENV ?? 'development');
  if (!['development', 'test', 'production'].includes(nodeEnv)) {
    throw new Error('NODE_ENV must be development, test, or production');
  }

  if (nodeEnv === 'production') {
    const jwtSecret = String(config.JWT_SECRET);
    if (jwtSecret.length < 32 || /change|example|your-|dev-secret/i.test(jwtSecret)) {
      throw new Error('JWT_SECRET must be a strong production secret with at least 32 characters');
    }
    if (!String(config.CORS_ORIGINS ?? '').trim()) {
      throw new Error('CORS_ORIGINS is required in production');
    }
  }

  const payOSKeys = ['PAYOS_CLIENT_ID', 'PAYOS_API_KEY', 'PAYOS_CHECKSUM_KEY'] as const;
  const configuredPayOSKeys = payOSKeys.filter((key) => String(config[key] ?? '').trim());
  if (configuredPayOSKeys.length > 0 && configuredPayOSKeys.length !== payOSKeys.length) {
    throw new Error('PAYOS_CLIENT_ID, PAYOS_API_KEY, and PAYOS_CHECKSUM_KEY must be configured together');
  }
  for (const key of ['PAYOS_RETURN_URL', 'PAYOS_CANCEL_URL'] as const) {
    const value = String(config[key] ?? '').trim();
    if (!value) continue;
    try {
      const url = new URL(value);
      if (!['https:', 'hotelia:'].includes(url.protocol)) throw new Error();
    } catch {
      throw new Error(`${key} must be an HTTPS URL or a hotelia:// deep link`);
    }
  }

  return config;
}
