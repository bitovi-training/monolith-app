type MockJwtOptions = {
  sub?: string;
  email?: string;
  roles?: string[];
  includeRoles?: boolean;
  exp?: number;
  iat?: number;
};

const base64UrlEncode = (payload: Record<string, unknown>): string =>
  Buffer.from(JSON.stringify(payload)).toString('base64url');

export const createMockJwt = ({
  sub = 'test-user-123',
  email = 'test@example.com',
  roles = ['user'],
  includeRoles = true,
  exp,
  iat,
}: MockJwtOptions = {}): string => {
  const header = base64UrlEncode({ alg: 'none', typ: 'JWT' });
  const now = Math.floor(Date.now() / 1000);
  const payload: Record<string, unknown> = {
    sub,
    email,
    iat: iat ?? now,
  };

  if (typeof exp === 'number') {
    payload.exp = exp;
  }

  if (includeRoles) {
    payload.roles = roles;
  }

  const encodedPayload = base64UrlEncode(payload);
  return `${header}.${encodedPayload}.signature`;
};

export const getEnvTokenOrMock = (
  envName: string,
  options?: MockJwtOptions,
): string => {
  const envValue = process.env[envName];
  if (envValue && envValue.trim().length > 0) {
    return envValue;
  }
  return createMockJwt(options);
};
