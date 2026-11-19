/** Refresh body; the raw opaque token is stored only as a SHA-256 hash (8.6/D22). */
export interface RefreshRequest {
  refreshToken: string;
}
