import {
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import {SkipThrottle, Throttle} from '@nestjs/throttler';
import type {Response} from 'express';
import {AuthRateLimitGuard} from '../auth/guards/auth-rate-limit.guard';
import {RATE_LIMITS} from '../common/constants/rate-limits.constant';
import {ApiIdempotencyKeyHeader} from '../common/idempotency/decorators/api-idempotency-key-header.decorator';
import {RequireIdempotencyKey} from '../common/idempotency/decorators/require-idempotency-key.decorator';
import {CurrentUser} from '../common/security/decorators/current-user.decorator';
import {RateLimited} from '../common/security/decorators/rate-limited.decorator';
import {ClosePeriodParamsDto} from './dto/close-period-params.dto';
import {ListPeriodsQueryDto} from './dto/list-periods-query.dto';
import {PeriodParamsDto} from './dto/period-params.dto';
import {PeriodSnapshotResponseDto} from './dto/period-snapshot-response.dto';
import {PeriodSummaryResponseDto} from './dto/period-summary-response.dto';
import {PeriodClosingService} from './services/period-closing.service';
import {PeriodReadService} from './services/period-read.service';

/** Owner-scoped period reads and idempotent month closing (US-701/US-703). */
@ApiTags('periods')
@Controller('periods')
@UseGuards(AuthRateLimitGuard)
export class PeriodsController {
  constructor(
    private readonly periods: PeriodClosingService,
    private readonly reads: PeriodReadService,
  ) {}

  @Get()
  @RateLimited()
  // The shared guard evaluates every named throttler; only the read policy applies (13.1).
  @SkipThrottle({ip: true, identity: true, user: true})
  @Throttle({
    read: {limit: RATE_LIMITS.read.user.limit, ttl: RATE_LIMITS.read.user.ttl},
  })
  @ApiOperation({
    summary: 'Listar los períodos cerrados del usuario, del más reciente al más antiguo',
  })
  @ApiOkResponse({
    type: PeriodSummaryResponseDto,
    isArray: true,
    description: 'Lista en el envelope estándar {data, error}.',
  })
  @ApiBadRequestResponse({description: 'Rango `from`/`to` inválido o mayor a 24 meses.'})
  @ApiUnauthorizedResponse({description: 'Falta un token de acceso válido.'})
  @ApiTooManyRequestsResponse({description: 'Límite de lecturas excedido.'})
  async list(
    @CurrentUser() publicId: string,
    @Query() query: ListPeriodsQueryDto,
  ): Promise<PeriodSummaryResponseDto[]> {
    return this.reads.list(publicId, query);
  }

  @Get(':period')
  @RateLimited()
  @SkipThrottle({ip: true, identity: true, user: true})
  @Throttle({
    read: {limit: RATE_LIMITS.read.user.limit, ttl: RATE_LIMITS.read.user.ttl},
  })
  @ApiOperation({summary: 'Obtener la instantánea inmutable de un período propio'})
  @ApiParam({
    name: 'period',
    description: 'Mes UTC en formato YYYY-MM.',
    example: '2026-10',
  })
  @ApiOkResponse({
    type: PeriodSnapshotResponseDto,
    description: 'Instantánea en el envelope estándar {data, error}.',
  })
  @ApiBadRequestResponse({description: 'El período no tiene el formato YYYY-MM.'})
  @ApiNotFoundResponse({description: 'El período no existe o pertenece a otro usuario.'})
  @ApiUnauthorizedResponse({description: 'Falta un token de acceso válido.'})
  @ApiTooManyRequestsResponse({description: 'Límite de lecturas excedido.'})
  async find(
    @CurrentUser() publicId: string,
    @Param() params: PeriodParamsDto,
  ): Promise<PeriodSnapshotResponseDto> {
    return this.reads.find(publicId, params.period);
  }

  @Post(':period/close')
  @RequireIdempotencyKey()
  @ApiIdempotencyKeyHeader()
  @RateLimited()
  // The shared guard evaluates every named throttler; only the user policy applies (13.1).
  @SkipThrottle({ip: true, identity: true, read: true})
  @Throttle({
    user: {limit: RATE_LIMITS.mutation.user.limit, ttl: RATE_LIMITS.mutation.user.ttl},
  })
  @ApiOperation({summary: 'Cerrar un mes UTC y rellenar los períodos anteriores que falten'})
  @ApiParam({
    name: 'period',
    description: 'Mes UTC en formato YYYY-MM.',
    example: '2026-10',
  })
  @ApiCreatedResponse({
    type: PeriodSnapshotResponseDto,
    description: 'Cierre creado en el envelope estándar {data, error}.',
  })
  @ApiOkResponse({
    type: PeriodSnapshotResponseDto,
    description: 'Replay de un cierre ya existente; la instantánea no se recalcula.',
  })
  @ApiConflictResponse({
    description: 'El período es el actual, es futuro o hay un cierre en curso.',
  })
  @ApiUnprocessableEntityResponse({description: 'El período es anterior a la primera actividad.'})
  @ApiUnauthorizedResponse({description: 'Falta un token de acceso válido.'})
  @ApiTooManyRequestsResponse({description: 'Límite de mutaciones excedido.'})
  async close(
    @CurrentUser() publicId: string,
    @Param() params: ClosePeriodParamsDto,
    @Res({passthrough: true}) response: Response,
  ): Promise<PeriodSnapshotResponseDto> {
    const outcome = await this.periods.close(publicId, params.period);
    response.status(outcome.created ? HttpStatus.CREATED : HttpStatus.OK);
    return outcome.snapshot;
  }
}
