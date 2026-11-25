import {Injectable} from '@nestjs/common';
import type {AccountProgressionResponse} from '@peco/contracts';
import {AccountRepository} from '../../accounts/services/account.repository';
import {accountNotFoundException} from '../../accounts/utils/account-not-found.exception';
import {UtcClock} from '../../database/clock/utc-clock';
import {movementBalanceImpact} from '../../movements/utils/movement-balance-impact.util';
import {UserProfileRepository} from '../../users/services/user-profile.repository';
import {buildAccountCreditUsage} from '../utils/build-account-credit-usage.util';
import {buildAccountProgressionPoints} from '../utils/build-account-progression-points.util';
import {AccountProgressionRepository} from './account-progression.repository';

/**
 * Owner-scoped monthly balance series (US-802). A closed month starts from its
 * frozen row; an open month reconstructs the same opening from the ledger. The
 * live account balance remains authoritative for the current month.
 */
@Injectable()
export class AccountProgressionService {
  constructor(
    private readonly users: UserProfileRepository,
    private readonly accounts: AccountRepository,
    private readonly progression: AccountProgressionRepository,
    private readonly clock: UtcClock,
  ) {}

  async find(
    userPublicId: string,
    accountPublicId: string,
    period: string,
  ): Promise<AccountProgressionResponse> {
    const user = await this.users.findActiveByPublicId(userPublicId);
    if (!user) {
      throw accountNotFoundException();
    }

    const account = await this.accounts.findActiveByPublicId(user.id, accountPublicId);
    if (!account) {
      throw accountNotFoundException();
    }

    const currentPeriod = this.clock.now().slice(0, 7);
    const frozen =
      period < currentPeriod
        ? await this.progression.findFrozenBalance(user.id, account.id, period)
        : null;
    const initialBalance =
      frozen?.initialBalance ??
      (await this.progression.findOpeningBalance(user.id, account.id, period));
    const movements = await this.progression.findPeriodMovements(user.id, account.id, period);
    const projectedFinalBalance = movements.reduce(
      (balance, movement) =>
        balance +
        (movementBalanceImpact(
          movement.type,
          movement.amount,
          movement.accountId,
          movement.targetAccountId,
          movement.isCanceled,
        ).get(account.id) ?? 0),
      initialBalance,
    );
    const finalBalance =
      frozen?.finalBalance ??
      (period === currentPeriod ? account.currentBalance : projectedFinalBalance);

    return {
      period,
      account: frozen
        ? {
            publicId: account.publicId,
            name: frozen.accountName,
            type: frozen.accountType,
            color: frozen.color,
            icon: frozen.icon,
          }
        : {
            publicId: account.publicId,
            name: account.name,
            type: account.type,
            color: account.color,
            icon: account.icon,
          },
      initialBalance,
      finalBalance,
      creditUsage: buildAccountCreditUsage(
        frozen ? frozen.accountType : account.type,
        account.creditLimit,
        finalBalance,
      ),
      points: buildAccountProgressionPoints(
        period,
        account.id,
        initialBalance,
        finalBalance,
        movements,
      ),
    };
  }
}
