export interface JwtPayload {
  tokenVersion?: number;
  sub: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}
