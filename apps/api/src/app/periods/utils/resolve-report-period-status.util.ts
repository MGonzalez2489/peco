import type {ReportPeriodStatus} from '@peco/contracts';
import {ReportPeriodStatusEnum} from '@peco/enums';

/** Resolves the public temporal status of a UTC period (8.13). */
export const resolveReportPeriodStatus = (
  period: string,
  currentPeriod: string,
): ReportPeriodStatus => {
  if (period < currentPeriod) {
    return ReportPeriodStatusEnum.CLOSED.toString();
  }
  if (period > currentPeriod) {
    return ReportPeriodStatusEnum.FUTURE.toString();
  }
  return ReportPeriodStatusEnum.CURRENT.toString();
};
