import type {PasswordResetMail} from './types/password-reset-mail.type';

/** Provider-agnostic email port; v1 ships only the capture transport (F2). */
export interface MailService {
  sendPasswordReset(mail: PasswordResetMail): Promise<void>;
}
