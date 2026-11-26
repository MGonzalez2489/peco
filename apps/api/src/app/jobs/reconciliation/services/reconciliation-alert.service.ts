import {Injectable, Logger, Optional} from '@nestjs/common';
import {AlertRuleEnum, AlertSeverityEnum} from '@peco/enums';
import {AlertService} from '../../../common/observability/alert.service';
import {RECONCILIATION_ALERT_CODE} from '../constants/reconciliation-alert-code.constant';
import {RECONCILIATION_ALERT_SEVERITY} from '../constants/reconciliation-alert-severity.constant';
import type {ReconciliationDrift} from '../types/reconciliation-drift.type';

/** Emits one structured `ALERT` line per drifted account without identifiers (9.9/D50/US-1002). */
@Injectable()
export class ReconciliationAlertService {
  private readonly logger = new Logger(RECONCILIATION_ALERT_CODE);

  constructor(@Optional() private readonly alerts?: AlertService) {}

  drift(drift: ReconciliationDrift): void {
    const dimensions = {
      code: RECONCILIATION_ALERT_CODE,
      expectedBalance: drift.expectedBalance,
      currentBalance: drift.currentBalance,
      delta: drift.delta,
    } as const;

    if (this.alerts) {
      this.alerts.raise(
        AlertRuleEnum.RECONCILIATION_DRIFT.toString(),
        AlertSeverityEnum.PAGE.toString(),
        dimensions,
      );
      return;
    }

    this.logger.error({
      event: 'ALERT',
      alert: RECONCILIATION_ALERT_CODE,
      severity: RECONCILIATION_ALERT_SEVERITY,
      dimensions,
      autoCorrected: false,
    });
  }
}
