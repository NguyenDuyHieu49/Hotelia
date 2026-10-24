export interface JwtPayload {
  tokenVersion?: number;
  sub: string;
  email: string;
  role: string;
  /** Separates short-lived access tokens from refresh tokens signed with the same secret. */
  typ?: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}
