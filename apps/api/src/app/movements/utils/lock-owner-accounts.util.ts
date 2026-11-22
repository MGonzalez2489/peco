import {IsNull, type EntityManager} from 'typeorm';
import {AccountEntity} from '../../database/entities';

/** Locks the union of affected accounts in ascending internal id order (D49/D60). */
export const lockOwnerAccounts = async (
  manager: EntityManager,
  accounts: readonly (AccountEntity | null)[],
): Promise<AccountEntity[] | null> => {
  const ids = [
    ...new Set(
      accounts
        .filter((account): account is AccountEntity => account !== null)
        .map((account) => account.id),
    ),
  ].sort((left, right) => left - right);

  const locked: AccountEntity[] = [];
  for (const id of ids) {
    const row = await manager.findOne(AccountEntity, {
      where: {id, deletedAt: IsNull()},
      lock: {mode: 'pessimistic_write'},
    });
    if (!row) {
      return null;
    }
    locked.push(row);
  }
  return locked;
};
