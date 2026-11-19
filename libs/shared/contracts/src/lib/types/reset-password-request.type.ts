/** Reset-password body: a single-use token and the new password (8.6). */
export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}
