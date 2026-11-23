import {Injectable} from '@nestjs/common';
import {ConfigService} from '../../../config/config.service';
import {UtcClock} from '../../../database/clock/utc-clock';
import {RECONCILIATION_ACCOUNT_BATCH_SIZE} from '../constants/reconciliation-account-batch-size.constant';
import {RECONCILIATION_MOVEMENT_BATCH_SIZE} from '../constants/reconciliation-movement-batch-size.constant';
import type {ReconciliationDrift} from '../types/reconciliation-drift.type';
import type {ReconciliationResult} from '../types/reconciliation-result.type';
import {ReconciliationAlertService} from './reconciliation-alert.service';
import {ReconciliationMetricsService} from './reconciliation-metrics.service';
import {ReconciliationRepository} from './reconciliation.repository';

/** Recomputes each active account's balance from the ledger and reports drift (9.9). */
@Injectable()
export class ReconciliationService {
  constructor(
    private readonly configService: ConfigService,
    private readonly clock: UtcClock,
    private readonly repository: ReconciliationRepository,
    private readonly metrics: ReconciliationMetricsService,
    private readonly alerts: ReconciliationAlertService,
  ) {}

  async reconcile(): Promise<ReconciliationResult> {
    const now = this.clock.now();
    const inactiveDays = this.configService.config.operational.inactiveUserDays;
    const activeSince = new Date(Date.parse(now) - inactiveDays * 24 * 60 * 60 * 1000).toISOString();

    const run = await this.repository.withLock(async (manager) => {
      const accounts = await this.repository.findEligibleAccounts(manager, activeSince);
      const drifts: ReconciliationDrift[] = [];

      for (
        let offset = 0;
        offset < accounts.length;
        offset += RECONCILIATION_ACCOUNT_BATCH_SIZE
      ) {
        const batch = accounts.slice(offset, offset + RECONCILIATION_ACCOUNT_BATCH_SIZE);
        const impacts = await this.repository.readMovementImpacts(
          manager,
          batch.map((account) => account.id),
          RECONCILIATION_MOVEMENT_BATCH_SIZE,
        );

        const batchDrifts = batch.flatMap((account) => {
          const expectedBalance = account.initialBalance + (impacts.get(account.id) ?? 0);
          const delta = expectedBalance - account.currentBalance;
          if (delta === 0) {
            return [];
          }
          return [
            {
              userId: account.userId,
              accountPublicId: account.publicId,
              expectedBalance,
              currentBalance: account.currentBalance,
              delta,
            },
          ];
        });

        await this.repository.saveDrifts(manager, batchDrifts);
        drifts.push(...batchDrifts);
      }

      return {scannedAccounts: accounts.length, drifts};
    });

    if (run === null) {
      return {acquired: false, scannedAccounts: 0, mismatches: 0};
    }

    for (const drift of run.drifts) {
      this.metrics.incrementDrift();
      this.alerts.drift(drift);
    }

    return {
      acquired: true,
      scannedAccounts: run.scannedAccounts,
      mismatches: run.drifts.length,
    };
  }
}
