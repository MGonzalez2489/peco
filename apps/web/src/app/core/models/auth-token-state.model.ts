/** In-memory token state; persistence belongs to the future session service. */
export interface AuthTokenState {
  accessToken: string | null;
  refreshToken: string | null;
  expiresIn: number;
  refreshExpiresIn: number;
}
