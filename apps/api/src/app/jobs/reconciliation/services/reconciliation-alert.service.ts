import {Injectable, Logger} from '@nestjs/common';
import {RECONCILIATION_ALERT_CODE} from '../constants/reconciliation-alert-code.constant';
import {RECONCILIATION_ALERT_SEVERITY} from '../constants/reconciliation-alert-severity.constant';
import type {ReconciliationDrift} from '../types/reconciliation-drift.type';

/** Emits one structured `ALERT` line per drifted account (9.9/D50). */
@Injectable()
export class ReconciliationAlertService {
  private readonly logger = new Logger(RECONCILIATION_ALERT_CODE);

  drift(drift: ReconciliationDrift): void {
    this.logger.error({
      alert: RECONCILIATION_ALERT_CODE,
      severity: RECONCILIATION_ALERT_SEVERITY,
      accountPublicId: drift.accountPublicId,
      userId: drift.userId,
      expectedBalance: drift.expectedBalance,
      currentBalance: drift.currentBalance,
      delta: drift.delta,
      autoCorrected: false,
    });
  }
}
