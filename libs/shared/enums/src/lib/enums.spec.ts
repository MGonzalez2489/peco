import {describe, expect, it} from 'vitest';
import {
  AccountTypeEnum,
  AccountWriteStatusEnum,
  ApiErrorCodeEnum,
  AppThemeEnum,
  AuditActionEnum,
  AuditEntityEnum,
  CategoryApplyTypeEnum,
  MovementTypeEnum,
  MovementWriteStatusEnum,
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
    expect(AccountWriteStatusEnum.UPDATED.toString()).toBe('updated');
    expect(AccountWriteStatusEnum.DELETED.toString()).toBe('deleted');
    expect(AccountWriteStatusEnum.NOT_FOUND.toString()).toBe('not-found');
    expect(AccountWriteStatusEnum.CONFLICT.toString()).toBe('conflict');
    expect(AccountWriteStatusEnum.ROOT_PROTECTED.toString()).toBe('root-protected');
    expect(AccountWriteStatusEnum.SELF_TRANSFER.toString()).toBe('self-transfer');
    expect(AccountWriteStatusEnum.TRANSFER_REQUIRED.toString()).toBe('transfer-required');
    expect(AccountWriteStatusEnum.NEGATIVE_BALANCE.toString()).toBe('negative-balance');
    expect(AccountWriteStatusEnum.PERIOD_CLOSED.toString()).toBe('period-closed');
    expect(MovementWriteStatusEnum.CREATED.toString()).toBe('created');
    expect(MovementWriteStatusEnum.UPDATED.toString()).toBe('updated');
    expect(MovementWriteStatusEnum.REPLACED.toString()).toBe('replaced');
    expect(MovementWriteStatusEnum.DELETED.toString()).toBe('deleted');
    expect(MovementWriteStatusEnum.REVERTED.toString()).toBe('reverted');
    expect(MovementWriteStatusEnum.NOT_FOUND.toString()).toBe('not-found');
    expect(MovementWriteStatusEnum.SELF_TRANSFER.toString()).toBe('self-transfer');
    expect(MovementWriteStatusEnum.TRANSFER_REQUIRED.toString()).toBe('transfer-required');
    expect(MovementWriteStatusEnum.CATEGORY_NOT_COMPATIBLE.toString()).toBe(
      'category-not-compatible',
    );
    expect(MovementWriteStatusEnum.NEGATIVE_BALANCE.toString()).toBe('negative-balance');
    expect(MovementWriteStatusEnum.PERIOD_CLOSED.toString()).toBe('period-closed');
    expect(MovementWriteStatusEnum.LOCKED.toString()).toBe('locked');
    expect(MovementWriteStatusEnum.CONFLICT.toString()).toBe('conflict');
    expect(AuditActionEnum.RECONCILE_MISMATCH.toString()).toBe('RECONCILE_MISMATCH');
    expect(AuditEntityEnum.ACCOUNTS.toString()).toBe('accounts');
  });

  it('keeps every account write status in a single registry', () => {
    expect(Object.values(AccountWriteStatusEnum).map((status) => status.toString())).toEqual([
      'updated',
      'deleted',
      'not-found',
      'conflict',
      'root-protected',
      'self-transfer',
      'transfer-required',
      'negative-balance',
      'period-closed',
    ]);
  });

  it('keeps every movement write status in a single registry', () => {
    expect(Object.values(MovementWriteStatusEnum).map((status) => status.toString())).toEqual([
      'created',
      'updated',
      'replaced',
      'deleted',
      'reverted',
      'not-found',
      'self-transfer',
      'transfer-required',
      'category-not-compatible',
      'negative-balance',
      'period-closed',
      'locked',
      'conflict',
    ]);
  });

  it('keeps every audit action and entity in a single registry', () => {
    expect(Object.values(AuditActionEnum).map((action) => action.toString())).toEqual([
      'DELETE',
      'EDIT',
      'REPLACE',
      'REVERSAL',
      'RECONCILE_MISMATCH',
    ]);
    expect(Object.values(AuditEntityEnum).map((entity) => entity.toString())).toEqual([
      'accounts',
      'movements',
      'users',
    ]);
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
      'MOVEMENT_NOT_FOUND',
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
