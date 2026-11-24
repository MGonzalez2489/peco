import {
  Controller,
  HttpStatus,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import type {Response} from 'express';
import {SkipThrottle, Throttle} from '@nestjs/throttler';
import {AuthRateLimitGuard} from '../auth/guards/auth-rate-limit.guard';
import {RATE_LIMITS} from '../common/constants/rate-limits.constant';
import {ApiIdempotencyKeyHeader} from '../common/idempotency/decorators/api-idempotency-key-header.decorator';
import {RequireIdempotencyKey} from '../common/idempotency/decorators/require-idempotency-key.decorator';
import {CurrentUser} from '../common/security/decorators/current-user.decorator';
import {RateLimited} from '../common/security/decorators/rate-limited.decorator';
import {ClosePeriodParamsDto} from './dto/close-period-params.dto';
import {PeriodSnapshotResponseDto} from './dto/period-snapshot-response.dto';
import {PeriodClosingService} from './services/period-closing.service';

/** Idempotent month closing with the sequential backfill of missing months (US-701). */
@ApiTags('periods')
@Controller('periods')
@UseGuards(AuthRateLimitGuard)
export class PeriodsController {
  constructor(private readonly periods: PeriodClosingService) {}

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
