/** Signed JWT and its lifetime in seconds. */
export interface IssuedAccessToken {
  token: string;
  expiresIn: number;
}
