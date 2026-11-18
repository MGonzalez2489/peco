/** Everything the transactional registration writer persists. */
export interface RegistrationInput {
  email: string;
  passwordHash: string;
  name: string;
  refreshTokenHash: string;
  refreshExpiresAt: string;
}
