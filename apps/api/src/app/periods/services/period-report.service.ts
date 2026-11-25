import {Injectable} from '@nestjs/common';
import type {DashboardReportComparison} from '@peco/contracts';
import {UtcClock} from '../../database/clock/utc-clock';
import {UserProfileRepository} from '../../users/services/user-profile.repository';
import type {PeriodReport} from '../types/period-report.type';
import {buildDashboardReportComparison} from '../utils/build-dashboard-report-comparison.util';
import {buildPeriodReportBalances} from '../utils/build-period-report-balances.util';
import {buildPeriodReportTotals} from '../utils/build-period-report-totals.util';
import {periodReadException} from '../utils/period-read.exception';
import {previousPeriod} from '../utils/previous-period.util';
import {resolveReportPeriodStatus} from '../utils/resolve-report-period-status.util';
import {PeriodClosingRepository} from './period-closing.repository';
import {PeriodReadRepository} from './period-read.repository';

type PeriodReportFigures = Pick<PeriodReport, 'period' | 'frozen' | 'totals' | 'balances'>;

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

    const firstActivity = await this.closing.findFirstActivityPeriod(user.id);
    if (!firstActivity) {
      throw periodReadException();
    }

    const currentPeriod = this.clock.now().slice(0, 7);
    const figures = await this.projectFigures(user.id, period, currentPeriod, firstActivity);
    const comparison =
      period <= firstActivity
        ? null
        : await this.comparisonFor(user.id, period, currentPeriod, firstActivity);

    return {
      ...figures,
      status: resolveReportPeriodStatus(period, currentPeriod),
      comparison,
    };
  }

  private async projectFigures(
    userId: number,
    period: string,
    currentPeriod: string,
    firstActivity: string,
  ): Promise<PeriodReportFigures> {
    if (period < firstActivity) {
      return {
        period,
        frozen: false,
        totals: buildPeriodReportTotals(0, 0, 0),
        balances: buildPeriodReportBalances([]),
      };
    }

    if (period < currentPeriod) {
      const frozen = await this.read.findByPeriod(userId, period);
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

    const calculation = await this.closing.project(userId, period);
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

  private async comparisonFor(
    userId: number,
    period: string,
    currentPeriod: string,
    firstActivity: string,
  ): Promise<DashboardReportComparison> {
    const previous = previousPeriod(period);
    const figures = await this.projectFigures(userId, previous, currentPeriod, firstActivity);
    return buildDashboardReportComparison(previous, figures.totals);
  }
}
