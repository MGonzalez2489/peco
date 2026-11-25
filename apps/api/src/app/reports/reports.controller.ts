import {Controller, Get, Param, Query, UseGuards} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
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
import {AccountProgressionQueryDto} from './dto/account-progression-query.dto';
import {AccountProgressionResponseDto} from './dto/account-progression-response.dto';
import {DashboardReportQueryDto} from './dto/dashboard-report-query.dto';
import {DashboardReportResponseDto} from './dto/dashboard-report-response.dto';
import {AccountProgressionService} from './services/account-progression.service';

/** Read-only account and dashboard reports from frozen snapshots or the live ledger (US-801/US-802). */
@ApiTags('reports')
@Controller('reports')
@UseGuards(AuthRateLimitGuard)
export class ReportsController {
  constructor(
    private readonly reports: PeriodReportService,
    private readonly accountProgressionService: AccountProgressionService,
  ) {}

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

  @Get('accounts/:publicId/progression')
  @RateLimited()
  // The shared guard evaluates every named throttler; only the read policy applies (13.1).
  @SkipThrottle({ip: true, identity: true, user: true})
  @Throttle({
    read: {limit: RATE_LIMITS.read.user.limit, ttl: RATE_LIMITS.read.user.ttl},
  })
  @ApiOperation({summary: 'Obtener la evolución saldada de una cuenta propia en un mes UTC'})
  @ApiParam({name: 'publicId', description: 'Identificador público de la cuenta.'})
  @ApiOkResponse({
    type: AccountProgressionResponseDto,
    description: 'Progresión en el envelope estándar {data, error}.',
  })
  @ApiBadRequestResponse({description: 'El período no tiene el formato YYYY-MM.'})
  @ApiNotFoundResponse({description: 'La cuenta no existe o pertenece a otro usuario.'})
  @ApiUnauthorizedResponse({description: 'Falta un token de acceso válido.'})
  @ApiTooManyRequestsResponse({description: 'Límite de lecturas excedido.'})
  async accountProgression(
    @CurrentUser() publicId: string,
    @Param('publicId') accountPublicId: string,
    @Query() query: AccountProgressionQueryDto,
  ): Promise<AccountProgressionResponseDto> {
    return new AccountProgressionResponseDto(
      await this.accountProgressionService.find(publicId, accountPublicId, query.period),
    );
  }
}
