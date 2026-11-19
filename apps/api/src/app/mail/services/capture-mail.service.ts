import {Injectable, Logger} from '@nestjs/common';
import type {MailService} from '../mail-service';
import type {PasswordResetMail} from '../types/password-reset-mail.type';

/**
 * Captures reset messages in memory and logs a redacted event; nothing is sent.
 * The raw token is deliberately absent from the log line (13.1) but remains
 * available to local tooling through `capturedMessages()` until F2 is resolved.
 */
@Injectable()
export class CaptureMailService implements MailService {
  private readonly logger = new Logger(CaptureMailService.name);
  private readonly captured: PasswordResetMail[] = [];

  async sendPasswordReset(mail: PasswordResetMail): Promise<void> {
    this.captured.push({...mail});
    this.logger.log(
      {event: 'MAIL_CAPTURED', to: mail.to, expiresAt: mail.expiresAt},
      CaptureMailService.name,
    );
  }

  capturedMessages(): readonly PasswordResetMail[] {
    return [...this.captured];
  }
}
