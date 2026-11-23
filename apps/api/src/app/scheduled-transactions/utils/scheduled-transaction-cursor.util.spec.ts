import {decodeScheduledTransactionCursor} from './decode-scheduled-transaction-cursor.util';
import {encodeScheduledTransactionCursor} from './encode-scheduled-transaction-cursor.util';

describe('scheduled transaction cursors (8.11/US-602)', () => {
  const cursor = {date: '2026-12-01', id: 12};

  it('round-trips through a base64url opaque token', () => {
    const token = encodeScheduledTransactionCursor(cursor);

    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(JSON.parse(Buffer.from(token, 'base64url').toString('utf8'))).toEqual({
      d: cursor.date,
      i: cursor.id,
    });
    expect(decodeScheduledTransactionCursor(token)).toEqual(cursor);
  });

  it.each([
    ['plain text', 'not-a-cursor'],
    ['non-base64 payload', 'eyJkIjoi***IsImkiOjEyfQ'],
    ['missing id', Buffer.from('{"d":"2026-12-01"}').toString('base64url')],
    ['non-integer id', Buffer.from('{"d":"2026-12-01","i":1.5}').toString('base64url')],
    ['timestamp instead of date', Buffer.from('{"d":"2026-12-01T00:00:00.000Z","i":12}').toString('base64url')],
    ['impossible date', Buffer.from('{"d":"2026-02-30","i":12}').toString('base64url')],
  ])('rejects a %s cursor', (_label, token) => {
    expect(decodeScheduledTransactionCursor(token)).toBeNull();
  });
});
