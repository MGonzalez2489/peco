import {decodeMovementCursor} from './decode-movement-cursor.util';
import {encodeMovementCursor} from './encode-movement-cursor.util';

describe('movement cursors (8.4/D101)', () => {
  const cursor = {date: '2026-11-12T15:04:05.123Z', id: 12};

  it('round-trips through a base64url opaque token', () => {
    const token = encodeMovementCursor(cursor);

    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(JSON.parse(Buffer.from(token, 'base64url').toString('utf8'))).toEqual({
      d: cursor.date,
      i: cursor.id,
    });
    expect(decodeMovementCursor(token)).toEqual(cursor);
  });

  it.each([
    ['plain text', 'not-a-cursor'],
    ['non-base64 payload', 'eyJkIjoi***IsImkiOjEyfQ'],
    ['missing id', Buffer.from('{"d":"2026-11-12"}').toString('base64url')],
    ['non-integer id', Buffer.from('{"d":"2026-11-12","i":1.5}').toString('base64url')],
    ['impossible date', Buffer.from('{"d":"never","i":12}').toString('base64url')],
  ])('rejects a %s cursor', (_label, token) => {
    expect(decodeMovementCursor(token)).toBeNull();
  });
});
