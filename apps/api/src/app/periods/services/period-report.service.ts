import {Injectable} from '@nestjs/common';
import {UtcClock} from '../../database/clock/utc-clock';
import {UserProfileRepository} from '../../users/services/user-profile.repository';
import type {PeriodReport} from '../types/period-report.type';
import {buildPeriodReportBalances} from '../utils/build-period-report-balances.util';
import {buildPeriodReportTotals} from '../utils/build-period-report-totals.util';
import {periodReadException} from '../utils/period-read.exception';
import {PeriodClosingRepository} from './period-closing.repository';
import {PeriodReadRepository} from './period-read.repository';

/**
 * Owner-scoped report figures with the frozen/ledger split of 11.6: a past month
 * with a snapshot is immutable, everything else is projected from the ledger.
 * Movement lists are untouched; this service only supplies totals and balances.
 */
@Injectable()
export class PeriodReportService {
  constructor(
    private readonly read: PeriodReadRepository,
    private readonly closing: PeriodClosingRepository,
    private readonly users: UserProfileRepository,
    private readonly clock: UtcClock,
  ) {}

  async find(userPublicId: string, period: string): Promise<PeriodReport> {
    const user = await this.users.findActiveByPublicId(userPublicId);
    if (!user) {
      throw periodReadException();
    }

    if (period < this.clock.now().slice(0, 7)) {
      const frozen = await this.read.findByPeriod(user.id, period);
      if (frozen) {
        return {
          period,
          frozen: true,
          totals: buildPeriodReportTotals(
            frozen.snapshot.totalInflows,
            frozen.snapshot.totalOutflows,
            frozen.snapshot.totalTransactionsCount,
          ),
          balances: buildPeriodReportBalances(
            frozen.balances.map((balance) => ({
              type: balance.accountType,
              currentBalance: balance.finalBalance,
              includeInTotal: balance.includeInTotal,
            })),
          ),
        };
      }
    }

    const calculation = await this.closing.project(user.id, period);
    return {
      period,
      frozen: false,
      totals: buildPeriodReportTotals(
        calculation.totalInflows,
        calculation.totalOutflows,
        calculation.totalTransactionsCount,
      ),
      balances: buildPeriodReportBalances(
        calculation.accountBalances.map((row) => ({
          type: row.account.type,
          currentBalance: row.finalBalance,
          includeInTotal: row.account.includeInTotal,
        })),
      ),
    };
  }
}
