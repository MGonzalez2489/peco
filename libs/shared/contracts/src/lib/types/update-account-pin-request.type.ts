/** Explicit pin state for `PATCH /accounts/:publicId/pin` (8.8/US-304). */
export interface UpdateAccountPinRequest {
  pinToHome: boolean;
  version?: number;
}
