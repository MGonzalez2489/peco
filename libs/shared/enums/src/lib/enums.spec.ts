import {describe, expect, it} from 'vitest';
import {
  AccountTypeEnum,
  ApiErrorCodeEnum,
  AppThemeEnum,
  CategoryApplyTypeEnum,
  MovementTypeEnum,
  RecurrenceFrequencyEnum,
  RefreshRotationStatusEnum,
  ScheduledExecutionStatusEnum,
  ScheduledTransactionTypeEnum,
  stringEnumValue,
} from '../index';

describe('shared enums', () => {
  it('returns the wire value from toString()', () => {
    expect(AccountTypeEnum.CREDIT.toString()).toBe('CREDIT');
    expect(MovementTypeEnum.TRANSFER.toString()).toBe('TRANSFER');
    expect(ScheduledTransactionTypeEnum.EXPENSE.toString()).toBe('EXPENSE');
    expect(CategoryApplyTypeEnum.BOTH.toString()).toBe('BOTH');
    expect(RecurrenceFrequencyEnum.FORTNIGHTLY.toString()).toBe('FORTNIGHTLY');
    expect(ScheduledExecutionStatusEnum.SKIPPED.toString()).toBe('SKIPPED');
    expect(AppThemeEnum.SYSTEM.toString()).toBe('system');
    expect(RefreshRotationStatusEnum.REUSED.toString()).toBe('reused');
  });

  it('keeps every API error code in a single registry', () => {
    expect(Object.values(ApiErrorCodeEnum).map((code) => code.toString())).toEqual([
      'VALIDATION_ERROR',
      'PAYLOAD_TOO_LARGE',
      'INVALID_RESET_TOKEN',
      'UNAUTHORIZED',
      'TOKEN_EXPIRED',
      'INVALID_CREDENTIALS',
      'REFRESH_TOKEN_REUSED',
      'REFRESH_TOKEN_EXPIRED',
      'FORBIDDEN',
      'NOT_FOUND',
      'EMAIL_ALREADY_REGISTERED',
      'VERSION_CONFLICT',
      'IDEMPOTENCY_KEY_REUSED',
      'PERIOD_CLOSED',
      'MOVEMENT_LOCKED',
      'ROOT_ACCOUNT_PROTECTED',
      'CATEGORY_SYSTEM_PROTECTED',
      'CATEGORY_NAME_TAKEN',
      'TRANSFER_REQUIRED',
      'NEGATIVE_BALANCE_NOT_ALLOWED',
      'PERIOD_NOT_CLOSABLE',
      'PERIOD_BEFORE_ACTIVITY',
      'SCHEDULE_NOT_DUE',
      'SCHEDULE_INACTIVE',
      'OCCURRENCE_ALREADY_PROCESSED',
      'UNPROCESSABLE_ENTITY',
      'CATEGORY_NOT_COMPATIBLE',
      'RATE_LIMITED',
      'INTERNAL_ERROR',
    ]);
  });

  it('builds literal-preserving enum members', () => {
    expect(stringEnumValue('custom').toString()).toBe('custom');
  });
});
