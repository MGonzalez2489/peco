/** Opaque refresh token, its stored SHA-256 hash and its lifetime in seconds. */
export interface IssuedRefreshToken {
  token: string;
  tokenHash: string;
  expiresAt: string;
  expiresIn: number;
}
