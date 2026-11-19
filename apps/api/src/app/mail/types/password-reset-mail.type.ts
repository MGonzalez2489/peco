/** Reset email content handed to the mail port; `token` is the raw one-time link. */
export interface PasswordResetMail {
  to: string;
  token: string;
  expiresAt: string;
}
