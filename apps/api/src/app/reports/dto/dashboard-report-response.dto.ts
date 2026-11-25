import type {DashboardReportResponse, ReportPeriodStatus} from '@peco/contracts';
import {ReportPeriodStatusEnum} from '@peco/enums';
import {ApiProperty} from '@nestjs/swagger';
import type {PeriodReport} from '../../periods/types/period-report.type';
import {DashboardReportBalancesDto} from './dashboard-report-balances.dto';
import {DashboardReportComparisonDto} from './dashboard-report-comparison.dto';
import {DashboardReportTotalsDto} from './dashboard-report-totals.dto';

const REPORT_PERIOD_STATUSES: readonly ReportPeriodStatus[] = Object.values(
  ReportPeriodStatusEnum,
).map((member) => member.toString());

/** Public dashboard report in the D65 single-resource shape (8.13). */
export class DashboardReportResponseDto implements DashboardReportResponse {
  @ApiProperty({example: '2026-11', description: 'Mes UTC consultado.'})
  readonly period: string;

  @ApiProperty({
    enum: REPORT_PERIOD_STATUSES,
    example: ReportPeriodStatusEnum.CURRENT.toString(),
  })
  readonly status: ReportPeriodStatus;

  @ApiProperty({type: DashboardReportTotalsDto})
  readonly totals: DashboardReportTotalsDto;

  @ApiProperty({type: DashboardReportBalancesDto})
  readonly balances: DashboardReportBalancesDto;

  @ApiProperty({type: DashboardReportComparisonDto, nullable: true})
  readonly comparison: DashboardReportComparisonDto | null;

  constructor(report: PeriodReport) {
    this.period = report.period;
    this.status = report.status;
    this.totals = {...report.totals};
    this.balances = {...report.balances};
    this.comparison = report.comparison ? {...report.comparison} : null;
  }
}
