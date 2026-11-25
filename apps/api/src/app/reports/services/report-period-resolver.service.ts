import {Injectable} from '@nestjs/common';
import type {ReportPeriodQuery} from '@peco/contracts';
import {UtcClock} from '../../database/clock/utc-clock';
import {resolveReportPeriod} from '../utils/resolve-report-period.util';

/** Applies the shared EP-08 period defaults and range guard before any report read (US-806). */
@Injectable()
export class ReportPeriodResolver {
  constructor(private readonly clock: UtcClock) {}

  resolve(query: ReportPeriodQuery): string {
    return resolveReportPeriod(query, this.clock.now().slice(0, 7));
  }
}
