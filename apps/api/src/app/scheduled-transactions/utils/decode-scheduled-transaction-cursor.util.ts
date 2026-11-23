import {isISO8601} from 'class-validator';
import type {ScheduledTransactionCursor} from '../types/scheduled-transaction-cursor.type';

const BASE64URL = /^[A-Za-z0-9_-]+$/;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Returns null for malformed cursors so callers can answer `400 VALIDATION_ERROR`. */
export const decodeScheduledTransactionCursor = (value: string): ScheduledTransactionCursor | null => {
  if (typeof value !== 'string' || !BASE64URL.test(value)) {
    return null;
  }

  try {
    const payload: unknown = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
    if (typeof payload !== 'object' || payload === null) {
      return null;
    }

    const candidate = payload as {d?: unknown; i?: unknown};
    if (
      typeof candidate.d !== 'string' ||
      !DATE_ONLY.test(candidate.d) ||
      !isISO8601(candidate.d, {strict: true})
    ) {
      return null;
    }
    if (
      typeof candidate.i !== 'number' ||
      !Number.isSafeInteger(candidate.i) ||
      candidate.i < 1
    ) {
      return null;
    }

    return {date: candidate.d, id: candidate.i};
  } catch {
    return null;
  }
};
