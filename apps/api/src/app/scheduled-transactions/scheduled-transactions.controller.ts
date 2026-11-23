import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
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
import {AuthRateLimitGuard} from '../auth/guards/auth-rate-limit.guard';
import {RATE_LIMITS} from '../common/constants/rate-limits.constant';
import {EnvelopeResult} from '../common/http/envelope-result';
import {ApiIdempotencyKeyHeader} from '../common/idempotency/decorators/api-idempotency-key-header.decorator';
import {RequireIdempotencyKey} from '../common/idempotency/decorators/require-idempotency-key.decorator';
import {CurrentUser} from '../common/security/decorators/current-user.decorator';
import {RateLimited} from '../common/security/decorators/rate-limited.decorator';
import {CreateScheduledTransactionRequestDto} from './dto/create-scheduled-transaction-request.dto';
import {ExecuteScheduledTransactionRequestDto} from './dto/execute-scheduled-transaction-request.dto';
import {ExecuteScheduledTransactionResponseDto} from './dto/execute-scheduled-transaction-response.dto';
import {ListScheduledTransactionsQueryDto} from './dto/list-scheduled-transactions-query.dto';
import {ScheduledTransactionResponseDto} from './dto/scheduled-transaction-response.dto';
import {ToggleScheduledTransactionRequestDto} from './dto/toggle-scheduled-transaction-request.dto';
import {UpdateScheduledTransactionRequestDto} from './dto/update-scheduled-transaction-request.dto';
import {ScheduledTransactionsService} from './scheduled-transactions.service';

/** Authenticated schedule creation, reads, edits, toggles and execution (US-601–US-604). */
@ApiTags('scheduled-transactions')
@Controller('scheduled-transactions')
@UseGuards(AuthRateLimitGuard)
export class ScheduledTransactionsController {
  constructor(private readonly schedules: ScheduledTransactionsService) {}

  @Post()
  @RateLimited()
  // The shared guard evaluates every named throttler; only the user policy applies (13.1).
  @SkipThrottle({ip: true, identity: true, read: true})
  @Throttle({
    user: {limit: RATE_LIMITS.mutation.user.limit, ttl: RATE_LIMITS.mutation.user.ttl},
  })
  @ApiOperation({summary: 'Crear un pago programado y derivar su malla de recurrencia'})
  @ApiCreatedResponse({
    description: 'Programa creado en el envelope estándar {data, error}.',
    schema: {
      type: 'object',
      properties: {
        data: {type: 'object'},
        error: {type: 'null', nullable: true, example: null},
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Cuerpo inválido: importe, intervalo, fechas o campo del servidor.',
  })
  @ApiNotFoundResponse({description: 'La cuenta o categoría no existe o pertenece a otro usuario.'})
  @ApiConflictResponse({description: 'Se requiere una cuenta de destino para la transferencia.'})
  @ApiUnprocessableEntityResponse({
    description: 'El destino es la propia cuenta o la categoría no acepta el tipo.',
  })
  @ApiUnauthorizedResponse({description: 'Falta un token de acceso válido.'})
  @ApiTooManyRequestsResponse({description: 'Límite de mutaciones excedido.'})
  create(
    @CurrentUser() publicId: string,
    @Body() request: CreateScheduledTransactionRequestDto,
  ): Promise<ScheduledTransactionResponseDto> {
    return this.schedules.create(publicId, request);
  }

  @Post(':publicId/execute')
  @RequireIdempotencyKey()
  @ApiIdempotencyKeyHeader()
  @RateLimited()
  // The shared guard evaluates every named throttler; only the user policy applies (13.1).
  @SkipThrottle({ip: true, identity: true, read: true})
  @Throttle({
    user: {limit: RATE_LIMITS.mutation.user.limit, ttl: RATE_LIMITS.mutation.user.ttl},
  })
  @ApiOperation({summary: 'Ejecutar una sola ocurrencia vencida de una programación propia'})
  @ApiParam({name: 'publicId', description: 'Identificador público del programa.'})
  @ApiCreatedResponse({
    type: ExecuteScheduledTransactionResponseDto,
    description: 'Ocurrencia aplicada u omitida en el envelope estándar {data, error}.',
  })
  @ApiOkResponse({
    type: ExecuteScheduledTransactionResponseDto,
    description: 'Replay de una ocurrencia ya procesada.',
  })
  @ApiBadRequestResponse({description: 'Cuerpo inválido o importe incorrecto.'})
  @ApiNotFoundResponse({description: 'El programa no existe o pertenece a otro usuario.'})
  @ApiConflictResponse({
    description: 'Programa pausado, ocurrencia no vencida, saldo insuficiente o período cerrado.',
  })
  @ApiUnauthorizedResponse({description: 'Falta un token de acceso válido.'})
  @ApiTooManyRequestsResponse({description: 'Límite de mutaciones excedido.'})
  execute(
    @CurrentUser() publicId: string,
    @Param('publicId') schedulePublicId: string,
    @Body() request: ExecuteScheduledTransactionRequestDto,
  ): Promise<ExecuteScheduledTransactionResponseDto> {
    return this.schedules.execute(publicId, schedulePublicId, request);
  }

  @Get()
  @RateLimited()
  // The shared guard evaluates every named throttler; only the read policy applies (13.1).
  @SkipThrottle({ip: true, identity: true, user: true})
  @Throttle({
    read: {limit: RATE_LIMITS.read.user.limit, ttl: RATE_LIMITS.read.user.ttl},
  })
  @ApiOperation({
    summary: 'Listar programas programados por período con cursor y filtros',
  })
  @ApiOkResponse({
    description: 'Lista en el envelope estándar {data, meta, error}; `meta.nextCursor`.',
    schema: {
      type: 'object',
      properties: {
        data: {type: 'array', items: {type: 'object'}},
        meta: {
          type: 'object',
          properties: {
            correlationId: {type: 'string'},
            nextCursor: {type: 'string', nullable: true, example: null},
          },
        },
        error: {type: 'null', nullable: true, example: null},
      },
    },
  })
  @ApiBadRequestResponse({description: 'Filtros, período o cursor inválidos.'})
  @ApiUnauthorizedResponse({description: 'Falta un token de acceso válido.'})
  @ApiTooManyRequestsResponse({description: 'Límite de lecturas excedido.'})
  list(
    @CurrentUser() publicId: string,
    @Query() query: ListScheduledTransactionsQueryDto,
  ): Promise<EnvelopeResult<ScheduledTransactionResponseDto[], {nextCursor: string | null}>> {
    return this.schedules.list(publicId, query).then(({items, nextCursor}) =>
      EnvelopeResult.withMeta(items, {nextCursor}),
    );
  }

  @Get(':publicId')
  @RateLimited()
  // The shared guard evaluates every named throttler; only the read policy applies (13.1).
  @SkipThrottle({ip: true, identity: true, user: true})
  @Throttle({
    read: {limit: RATE_LIMITS.read.user.limit, ttl: RATE_LIMITS.read.user.ttl},
  })
  @ApiOperation({summary: 'Obtener el detalle de un programa programado propio'})
  @ApiParam({name: 'publicId', description: 'Identificador público del programa.'})
  @ApiOkResponse({
    description: 'Programa en el envelope estándar {data, error}.',
    schema: {
      type: 'object',
      properties: {
        data: {type: 'object'},
        error: {type: 'null', nullable: true, example: null},
      },
    },
  })
  @ApiUnauthorizedResponse({description: 'Falta un token de acceso válido.'})
  @ApiNotFoundResponse({
    description: 'El programa no existe, pertenece a otro usuario o fue eliminado.',
  })
  @ApiTooManyRequestsResponse({description: 'Límite de lecturas excedido.'})
  findOne(
    @CurrentUser() publicId: string,
    @Param('publicId') schedulePublicId: string,
  ): Promise<ScheduledTransactionResponseDto> {
    return this.schedules.findOne(publicId, schedulePublicId);
  }

  @Patch(':publicId/toggle')
  @RateLimited()
  // The shared guard evaluates every named throttler; only the user policy applies (13.1).
  @SkipThrottle({ip: true, identity: true, read: true})
  @Throttle({
    user: {limit: RATE_LIMITS.mutation.user.limit, ttl: RATE_LIMITS.mutation.user.ttl},
  })
  @ApiOperation({summary: 'Pausar o reanudar una programación propia'})
  @ApiParam({name: 'publicId', description: 'Identificador público del programa.'})
  @ApiOkResponse({
    description: 'Programa actualizado en el envelope estándar {data, error}.',
    schema: {
      type: 'object',
      properties: {
        data: {type: 'object'},
        error: {type: 'null', nullable: true, example: null},
      },
    },
  })
  @ApiBadRequestResponse({description: 'Cuerpo inválido o malla de recurrencia agotada.'})
  @ApiNotFoundResponse({description: 'El programa no existe o pertenece a otro usuario.'})
  @ApiConflictResponse({description: 'Versión obsoleta.'})
  @ApiUnauthorizedResponse({description: 'Falta un token de acceso válido.'})
  @ApiTooManyRequestsResponse({description: 'Límite de mutaciones excedido.'})
  toggle(
    @CurrentUser() publicId: string,
    @Param('publicId') schedulePublicId: string,
    @Body() request: ToggleScheduledTransactionRequestDto,
  ): Promise<ScheduledTransactionResponseDto> {
    return this.schedules.toggle(publicId, schedulePublicId, request);
  }

  @Patch(':publicId')
  @RequireIdempotencyKey()
  @ApiIdempotencyKeyHeader()
  @RateLimited()
  // The shared guard evaluates every named throttler; only the user policy applies (13.1).
  @SkipThrottle({ip: true, identity: true, read: true})
  @Throttle({
    user: {limit: RATE_LIMITS.mutation.user.limit, ttl: RATE_LIMITS.mutation.user.ttl},
  })
  @ApiOperation({summary: 'Editar un programa programado propio con bloqueo optimista'})
  @ApiParam({name: 'publicId', description: 'Identificador público del programa.'})
  @ApiOkResponse({
    description: 'Programa actualizado en el envelope estándar {data, error}.',
    schema: {
      type: 'object',
      properties: {
        data: {type: 'object'},
        error: {type: 'null', nullable: true, example: null},
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Cuerpo inválido, fecha de fin anterior al ancla o malla agotada.',
  })
  @ApiNotFoundResponse({description: 'El programa o un recurso referenciado no existe.'})
  @ApiConflictResponse({
    description: 'Versión obsoleta u ocurrencia reprocesada al re-anclar la malla.',
  })
  @ApiUnprocessableEntityResponse({
    description: 'Transferencia sin destino, destino propio o categoría incompatible.',
  })
  @ApiUnauthorizedResponse({description: 'Falta un token de acceso válido.'})
  @ApiTooManyRequestsResponse({description: 'Límite de mutaciones excedido.'})
  update(
    @CurrentUser() publicId: string,
    @Param('publicId') schedulePublicId: string,
    @Body() request: UpdateScheduledTransactionRequestDto,
  ): Promise<ScheduledTransactionResponseDto> {
    return this.schedules.update(publicId, schedulePublicId, request);
  }
}
