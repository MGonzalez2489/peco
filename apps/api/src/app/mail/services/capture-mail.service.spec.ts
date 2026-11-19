import {Logger} from '@nestjs/common';
import {CaptureMailService} from './capture-mail.service';

describe('CaptureMailService (US-205)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('records the message and logs a redacted event without sending it', async () => {
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const service = new CaptureMailService();
    const mail = {
      to: 'user@example.com',
      token: 'raw-reset-token',
      expiresAt: '2026-11-19T13:00:00.000Z',
    };

    await expect(service.sendPasswordReset(mail)).resolves.toBeUndefined();

    expect(service.capturedMessages()).toEqual([mail]);
    expect(service.capturedMessages()[0]).not.toBe(mail);
    expect(log).toHaveBeenCalledWith(
      {event: 'MAIL_CAPTURED', to: mail.to, expiresAt: mail.expiresAt},
      CaptureMailService.name,
    );
    expect(JSON.stringify(log.mock.calls[0]?.[0])).not.toContain(mail.token);
  });
});
