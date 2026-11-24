import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
  ApiNoContentResponse,
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
import {PreviousLastActiveAt} from '../common/security/decorators/previous-last-active-at.decorator';
import {RateLimited} from '../common/security/decorators/rate-limited.decorator';
import {ApplyDueRequestDto} from './dto/apply-due-request.dto';
import {ApplyDueResponseDto} from './dto/apply-due-response.dto';
import {CancelScheduledOccurrenceRequestDto} from './dto/cancel-scheduled-occurrence-request.dto';
import {CancelScheduledOccurrenceResponseDto} from './dto/cancel-scheduled-occurrence-response.dto';
import {CreateScheduledTransactionRequestDto} from './dto/create-scheduled-transaction-request.dto';
import {DueSchedulesQueryDto} from './dto/due-schedules-query.dto';
import {ExecuteScheduledTransactionRequestDto} from './dto/execute-scheduled-transaction-request.dto';
import {ExecuteScheduledTransactionResponseDto} from './dto/execute-scheduled-transaction-response.dto';
import {ListScheduledTransactionsQueryDto} from './dto/list-scheduled-transactions-query.dto';
import {ScheduledTransactionResponseDto} from './dto/scheduled-transaction-response.dto';
import {ToggleScheduledTransactionRequestDto} from './dto/toggle-scheduled-transaction-request.dto';
import {UpdateScheduledTransactionRequestDto} from './dto/update-scheduled-transaction-request.dto';
import {ScheduledTransactionsService} from './scheduled-transactions.service';

/** Authenticated schedule creation, reads, edits, toggles, execution and cancellation (US-601–US-605). */
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

  @Post('apply-due')
  @HttpCode(HttpStatus.OK)
  @RequireIdempotencyKey()
  @ApiIdempotencyKeyHeader()
  @RateLimited()
  // The shared guard evaluates every named throttler; only the user policy applies (13.1).
  @SkipThrottle({ip: true, identity: true, read: true})
  @Throttle({
    user: {limit: RATE_LIMITS.mutation.user.limit, ttl: RATE_LIMITS.mutation.user.ttl},
  })
  @ApiOperation({
    summary: 'Aplicar todas las ocurrencias vencidas de las programaciones propias',
  })
  @ApiOkResponse({
    type: ApplyDueResponseDto,
    description: 'Resumen del catch-up en el envelope estándar {data, error}.',
  })
  @ApiBadRequestResponse({description: 'Cuerpo inválido: `asOf` debe ser YYYY-MM-DD.'})
  @ApiUnauthorizedResponse({description: 'Falta un token de acceso válido.'})
  @ApiTooManyRequestsResponse({description: 'Límite de mutaciones excedido.'})
  applyDue(
    @CurrentUser() publicId: string,
    @Body() request: ApplyDueRequestDto,
    @PreviousLastActiveAt() previousLastActiveAt: string | null,
  ): Promise<ApplyDueResponseDto> {
    return this.schedules.applyDue(publicId, request, previousLastActiveAt);
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

  @Post(':publicId/cancel-occurrence')
  @RequireIdempotencyKey()
  @ApiIdempotencyKeyHeader()
  @RateLimited()
  // The shared guard evaluates every named throttler; only the user policy applies (13.1).
  @SkipThrottle({ip: true, identity: true, read: true})
  @Throttle({
    user: {limit: RATE_LIMITS.mutation.user.limit, ttl: RATE_LIMITS.mutation.user.ttl},
  })
  @ApiOperation({summary: 'Cancelar una sola ocurrencia vencida sin afectar saldos'})
  @ApiParam({name: 'publicId', description: 'Identificador público del programa.'})
  @ApiCreatedResponse({
    type: CancelScheduledOccurrenceResponseDto,
    description: 'Ocurrencia cancelada en el envelope estándar {data, error}.',
  })
  @ApiBadRequestResponse({description: 'Cuerpo inválido: la nota supera 500 caracteres.'})
  @ApiNotFoundResponse({description: 'El programa no existe o pertenece a otro usuario.'})
  @ApiConflictResponse({
    description:
      'Programa pausado, ocurrencia no vencida, ya procesada o período cerrado sin escrituras.',
  })
  @ApiUnauthorizedResponse({description: 'Falta un token de acceso válido.'})
  @ApiTooManyRequestsResponse({description: 'Límite de mutaciones excedido.'})
  cancel(
    @CurrentUser() publicId: string,
    @Param('publicId') schedulePublicId: string,
    @Body() request: CancelScheduledOccurrenceRequestDto,
  ): Promise<CancelScheduledOccurrenceResponseDto> {
    return this.schedules.cancel(publicId, schedulePublicId, request);
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

  @Get('due')
  @RateLimited()
  // The shared guard evaluates every named throttler; only the read policy applies (13.1).
  @SkipThrottle({ip: true, identity: true, user: true})
  @Throttle({
    read: {limit: RATE_LIMITS.read.user.limit, ttl: RATE_LIMITS.read.user.ttl},
  })
  @ApiOperation({summary: 'Previsualizar programaciones vencidas sin escribir'})
  @ApiOkResponse({
    description:
      'Lista en el envelope estándar {data, meta, error}; `meta.pendingOccurrences` y `meta.skippedWhileInactive`.',
    schema: {
      type: 'object',
      properties: {
        data: {type: 'array', items: {type: 'object'}},
        meta: {
          type: 'object',
          properties: {
            pendingOccurrences: {type: 'integer'},
            skippedWhileInactive: {type: 'integer'},
            correlationId: {type: 'string'},
          },
        },
        error: {type: 'null', nullable: true, example: null},
      },
    },
  })
  @ApiBadRequestResponse({description: 'Filtros inválidos: `asOf` o `autoApply`.'})
  @ApiUnauthorizedResponse({description: 'Falta un token de acceso válido.'})
  @ApiTooManyRequestsResponse({description: 'Límite de lecturas excedido.'})
  findDue(
    @CurrentUser() publicId: string,
    @Query() query: DueSchedulesQueryDto,
    @PreviousLastActiveAt() previousLastActiveAt: string | null,
  ): Promise<
    EnvelopeResult<
      ScheduledTransactionResponseDto[],
      {pendingOccurrences: number; skippedWhileInactive: number}
    >
  > {
    return this.schedules
      .findDue(publicId, query, previousLastActiveAt)
      .then(({items, pendingOccurrences, skippedWhileInactive}) =>
        EnvelopeResult.withMeta(items, {pendingOccurrences, skippedWhileInactive}),
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

  @Delete(':publicId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RateLimited()
  // The shared guard evaluates every named throttler; only the user policy applies (13.1).
  @SkipThrottle({ip: true, identity: true, read: true})
  @Throttle({
    user: {limit: RATE_LIMITS.mutation.user.limit, ttl: RATE_LIMITS.mutation.user.ttl},
  })
  @ApiOperation({summary: 'Eliminar una programación propia sin borrar su historial'})
  @ApiParam({name: 'publicId', description: 'Identificador público del programa.'})
  @ApiNoContentResponse({description: 'Programa eliminado. Respuesta sin cuerpo.'})
  @ApiNotFoundResponse({
    description: 'El programa no existe, pertenece a otro usuario o ya fue eliminado.',
  })
  @ApiUnauthorizedResponse({description: 'Falta un token de acceso válido.'})
  @ApiTooManyRequestsResponse({description: 'Límite de mutaciones excedido.'})
  remove(
    @CurrentUser() publicId: string,
    @Param('publicId') schedulePublicId: string,
  ): Promise<void> {
    return this.schedules.remove(publicId, schedulePublicId);
  }
}
