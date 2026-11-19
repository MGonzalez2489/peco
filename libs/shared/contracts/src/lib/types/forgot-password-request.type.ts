/** Forgot-password body; the API normalizes the email before lookup (8.6). */
export interface ForgotPasswordRequest {
  email: string;
}
