import type {AccountEntity, CategoryEntity, MovementEntity} from '../../database/entities';

/** Public-id snapshot stored in `auditLogs.before`/`after` (7.3/9.4). */
export const movementAuditSnapshot = (
  movement: MovementEntity,
  account: AccountEntity,
  targetAccount: AccountEntity | null,
  category: CategoryEntity,
  version: number,
): Record<string, unknown> => ({
  publicId: movement.publicId,
  type: movement.type,
  amount: movement.amount,
  date: movement.date,
  note: movement.note,
  accountPublicId: account.publicId,
  targetAccountPublicId: targetAccount?.publicId ?? null,
  categoryPublicId: category.publicId,
  isReversal: movement.isReversal,
  isReversed: movement.isReversed,
  isCanceled: movement.isCanceled,
  version,
});
