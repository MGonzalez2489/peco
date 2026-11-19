/** Password-change body: the owner proves the old secret and supplies the new one (8.7). */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
