import {Injectable, Logger} from '@nestjs/common';
import {AlertRuleEnum, AlertSeverityEnum, type StringEnumValues} from '@peco/enums';
import {getCorrelationId} from '../middleware/correlation-id.context';
import {getJobKey} from './job-context';

type AlertRule = StringEnumValues<typeof AlertRuleEnum>;
type AlertSeverity = StringEnumValues<typeof AlertSeverityEnum>;
type AlertDimensionValue = string | number | boolean | null | undefined;

const ALLOWED_DIMENSIONS = new Set([
  'code',
  'job',
  'period',
  'status',
  'scannedAccounts',
  'mismatches',
  'delta',
  'expectedBalance',
  'currentBalance',
  'snapshotBalance',
  'ledgerBalance',
  'route',
  'statusCode',
]);

/**
 * Emits platform-owned alert lines only (D71). Dimensions are allowlisted so
 * identifiers, emails and tokens can never leak into the log stream (13.2).
 */
@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);

  raise(
    rule: AlertRule,
    severity: AlertSeverity,
    dimensions: Readonly<Record<string, AlertDimensionValue>> = {},
  ): void {
    const safeDimensions = Object.fromEntries(
      Object.entries(dimensions).filter(
        ([key, value]) =>
          ALLOWED_DIMENSIONS.has(key) &&
          (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'),
      ),
    );
    const correlationId = getCorrelationId();
    const jobKey = getJobKey();

    this.logger.error({
      event: 'ALERT',
      rule,
      severity,
      ...(correlationId ? {correlationId} : {}),
      ...(jobKey ? {jobKey} : {}),
      dimensions: safeDimensions,
      autoCorrected: false,
    });
  }
}
