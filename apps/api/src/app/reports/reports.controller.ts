import {Controller, Get, Query, UseGuards} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {SkipThrottle, Throttle} from '@nestjs/throttler';
import {AuthRateLimitGuard} from '../auth/guards/auth-rate-limit.guard';
import {RATE_LIMITS} from '../common/constants/rate-limits.constant';
import {CurrentUser} from '../common/security/decorators/current-user.decorator';
import {RateLimited} from '../common/security/decorators/rate-limited.decorator';
import {PeriodReportService} from '../periods/services/period-report.service';
import {DashboardReportQueryDto} from './dto/dashboard-report-query.dto';
import {DashboardReportResponseDto} from './dto/dashboard-report-response.dto';

/** Read-only dashboard reports from frozen snapshots or the live ledger (US-801). */
@ApiTags('reports')
@Controller('reports')
@UseGuards(AuthRateLimitGuard)
export class ReportsController {
  constructor(private readonly reports: PeriodReportService) {}

  @Get('dashboard')
  @RateLimited()
  // The shared guard evaluates every named throttler; only the read policy applies (13.1).
  @SkipThrottle({ip: true, identity: true, user: true})
  @Throttle({
    read: {limit: RATE_LIMITS.read.user.limit, ttl: RATE_LIMITS.read.user.ttl},
  })
  @ApiOperation({summary: 'Obtener el reporte del dashboard para un mes UTC'})
  @ApiOkResponse({
    type: DashboardReportResponseDto,
    description: 'Reporte en el envelope estándar {data, error}.',
  })
  @ApiBadRequestResponse({description: 'El período no tiene el formato YYYY-MM.'})
  @ApiNotFoundResponse({description: 'El usuario ya no está activo.'})
  @ApiUnauthorizedResponse({description: 'Falta un token de acceso válido.'})
  @ApiTooManyRequestsResponse({description: 'Límite de lecturas excedido.'})
  async dashboard(
    @CurrentUser() publicId: string,
    @Query() query: DashboardReportQueryDto,
  ): Promise<DashboardReportResponseDto> {
    return new DashboardReportResponseDto(
      await this.reports.find(publicId, query.period),
    );
  }
}
