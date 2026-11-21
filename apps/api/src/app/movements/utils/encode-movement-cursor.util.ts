import type {MovementCursor} from '../types/movement-cursor.type';

/** Base64url JSON cursor matching the §8.10 example; clients only echo it (8.4/D101). */
export const encodeMovementCursor = (cursor: MovementCursor): string =>
  Buffer.from(JSON.stringify({d: cursor.date, i: cursor.id}), 'utf8').toString('base64url');
