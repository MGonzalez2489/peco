/** Opaque reset token, its stored SHA-256 hash and its lifetime in seconds. */
export interface IssuedResetToken {
  token: string;
  tokenHash: string;
  expiresAt: string;
  expiresIn: number;
}
