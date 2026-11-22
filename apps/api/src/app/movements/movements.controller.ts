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
import {MovementResponseDto} from '../accounts/dto/movement-response.dto';
import {AuthRateLimitGuard} from '../auth/guards/auth-rate-limit.guard';
import {RATE_LIMITS} from '../common/constants/rate-limits.constant';
import {EnvelopeResult} from '../common/http/envelope-result';
import {CurrentUser} from '../common/security/decorators/current-user.decorator';
import {RateLimited} from '../common/security/decorators/rate-limited.decorator';
import {CreateMovementRequestDto} from './dto/create-movement-request.dto';
import {CreateMovementResponseDto} from './dto/create-movement-response.dto';
import {DeleteMovementResultDto} from './dto/delete-movement-result.dto';
import {ListMovementsQueryDto} from './dto/list-movements-query.dto';
import {MovementTotalsDto} from './dto/movement-totals.dto';
import {RevertMovementResponseDto} from './dto/revert-movement-response.dto';
import {UpdateMovementRequestDto} from './dto/update-movement-request.dto';
import {UpdateMovementResponseDto} from './dto/update-movement-response.dto';
import {MovementsService} from './movements.service';

/** Authenticated ledger reads and mutations (US-501–507). */
@ApiTags('movements')
@Controller('movements')
@UseGuards(AuthRateLimitGuard)
export class MovementsController {
  constructor(private readonly movements: MovementsService) {}

  @Get()
  @RateLimited()
  // The shared guard evaluates every named throttler; only the read policy applies (13.1).
  @SkipThrottle({ip: true, identity: true, user: true})
  @Throttle({
    read: {limit: RATE_LIMITS.read.user.limit, ttl: RATE_LIMITS.read.user.ttl},
  })
  @ApiOperation({summary: 'Listar movimientos con filtros, cursor y totales del conjunto filtrado'})
  @ApiOkResponse({
    description:
      'Lista en el envelope estándar {data, meta, error}; `meta.nextCursor` y `meta.totals`.',
    schema: {
      type: 'object',
      properties: {
        data: {type: 'array', items: {type: 'object'}},
        meta: {
          type: 'object',
          properties: {
            correlationId: {type: 'string'},
            nextCursor: {type: 'string', nullable: true, example: null},
            totals: {type: 'object'},
          },
        },
        error: {type: 'null', nullable: true, example: null},
      },
    },
  })
  @ApiBadRequestResponse({description: 'Filtros, rango o cursor inválidos.'})
  @ApiUnauthorizedResponse({description: 'Falta un token de acceso válido.'})
  @ApiTooManyRequestsResponse({description: 'Límite de lecturas excedido.'})
  async list(
    @CurrentUser() publicId: string,
    @Query() query: ListMovementsQueryDto,
  ): Promise<
    EnvelopeResult<
      MovementResponseDto[],
      {nextCursor: string | null; totals: MovementTotalsDto}
    >
  > {
    const {items, nextCursor, totals} = await this.movements.list(publicId, query);

    return EnvelopeResult.withMeta(items, {nextCursor, totals: new MovementTotalsDto(totals)});
  }

  @Get(':publicId')
  @RateLimited()
  // The shared guard evaluates every named throttler; only the read policy applies (13.1).
  @SkipThrottle({ip: true, identity: true, user: true})
  @Throttle({
    read: {limit: RATE_LIMITS.read.user.limit, ttl: RATE_LIMITS.read.user.ttl},
  })
  @ApiOperation({summary: 'Obtener el detalle de un movimiento propio'})
  @ApiParam({name: 'publicId', description: 'Identificador público del movimiento.'})
  @ApiOkResponse({
    description: 'Movimiento en el envelope estándar {data, error}.',
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
    description: 'El movimiento no existe, pertenece a otro usuario o fue eliminado.',
  })
  @ApiTooManyRequestsResponse({description: 'Límite de lecturas excedido.'})
  findOne(
    @CurrentUser() publicId: string,
    @Param('publicId') movementPublicId: string,
  ): Promise<MovementResponseDto> {
    return this.movements.findOne(publicId, movementPublicId);
  }

  @Patch(':publicId')
  @RateLimited()
  // The shared guard evaluates every named throttler; only the user policy applies (13.1).
  @SkipThrottle({ip: true, identity: true, read: true})
  @Throttle({
    user: {limit: RATE_LIMITS.mutation.user.limit, ttl: RATE_LIMITS.mutation.user.ttl},
  })
  @ApiOperation({
    summary: 'Editar un movimiento propio o reemplazarlo atómicamente al cambiar el tipo',
  })
  @ApiParam({name: 'publicId', description: 'Identificador público del movimiento.'})
  @ApiOkResponse({
    description:
      'Movimiento, saldos y —si cambió el tipo— `replacedPublicId` en el envelope {data, error}.',
    schema: {
      type: 'object',
      properties: {
        data: {type: 'object'},
        error: {type: 'null', nullable: true, example: null},
      },
    },
  })
  @ApiBadRequestResponse({description: 'Cuerpo inválido; `date` es inmutable.'})
  @ApiNotFoundResponse({description: 'El movimiento o un recurso referenciado no existe.'})
  @ApiConflictResponse({
    description: 'Versión obsoleta, movimiento bloqueado, saldo negativo o período cerrado.',
  })
  @ApiUnprocessableEntityResponse({
    description: 'Transferencia sin destino, destino propio o categoría incompatible.',
  })
  @ApiUnauthorizedResponse({description: 'Falta un token de acceso válido.'})
  @ApiTooManyRequestsResponse({description: 'Límite de mutaciones excedido.'})
  update(
    @CurrentUser() publicId: string,
    @Param('publicId') movementPublicId: string,
    @Body() request: UpdateMovementRequestDto,
  ): Promise<UpdateMovementResponseDto> {
    return this.movements.update(publicId, movementPublicId, request);
  }

  @Delete(':publicId')
  @HttpCode(HttpStatus.OK)
  @RateLimited()
  // The shared guard evaluates every named throttler; only the user policy applies (13.1).
  @SkipThrottle({ip: true, identity: true, read: true})
  @Throttle({
    user: {limit: RATE_LIMITS.mutation.user.limit, ttl: RATE_LIMITS.mutation.user.ttl},
  })
  @ApiOperation({
    summary: 'Eliminar un movimiento propio y revertir su impacto en los saldos',
  })
  @ApiParam({name: 'publicId', description: 'Identificador público del movimiento.'})
  @ApiOkResponse({
    description:
      'Movimiento eliminado, con su identificador y los saldos recalculados, en el envelope {data, error}.',
    schema: {
      type: 'object',
      properties: {
        data: {type: 'object'},
        error: {type: 'null', nullable: true, example: null},
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'El movimiento no existe, pertenece a otro usuario o ya fue eliminado.',
  })
  @ApiConflictResponse({
    description: 'Movimiento bloqueado, saldo negativo no permitido o período cerrado.',
  })
  @ApiUnauthorizedResponse({description: 'Falta un token de acceso válido.'})
  @ApiTooManyRequestsResponse({description: 'Límite de mutaciones excedido.'})
  remove(
    @CurrentUser() publicId: string,
    @Param('publicId') movementPublicId: string,
  ): Promise<DeleteMovementResultDto> {
    return this.movements.remove(publicId, movementPublicId);
  }

  @Post(':publicId/revert')
  @HttpCode(HttpStatus.CREATED)
  @RateLimited()
  // The shared guard evaluates every named throttler; only the user policy applies (13.1).
  @SkipThrottle({ip: true, identity: true, read: true})
  @Throttle({
    user: {limit: RATE_LIMITS.mutation.user.limit, ttl: RATE_LIMITS.mutation.user.ttl},
  })
  @ApiOperation({
    summary: 'Revertir un movimiento creando una contrapartida y marcando el original',
  })
  @ApiParam({name: 'publicId', description: 'Identificador público del movimiento original.'})
  @ApiCreatedResponse({
    description:
      'Original y contrapartida con los saldos actualizados en el envelope {data, error}.',
    schema: {
      type: 'object',
      properties: {
        data: {type: 'object'},
        error: {type: 'null', nullable: true, example: null},
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'El movimiento no existe, pertenece a otro usuario o ya fue eliminado.',
  })
  @ApiConflictResponse({
    description:
      'Movimiento bloqueado, saldo negativo no permitido o período cerrado (crea un movimiento compensatorio).',
  })
  @ApiUnauthorizedResponse({description: 'Falta un token de acceso válido.'})
  @ApiTooManyRequestsResponse({description: 'Límite de mutaciones excedido.'})
  revert(
    @CurrentUser() publicId: string,
    @Param('publicId') movementPublicId: string,
  ): Promise<RevertMovementResponseDto> {
    return this.movements.revert(publicId, movementPublicId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RateLimited()
  // The shared guard evaluates every named throttler; only the user policy applies (13.1).
  @SkipThrottle({ip: true, identity: true, read: true})
  @Throttle({
    user: {limit: RATE_LIMITS.mutation.user.limit, ttl: RATE_LIMITS.mutation.user.ttl},
  })
  @ApiOperation({summary: 'Crear un movimiento y actualizar los saldos afectados'})
  @ApiCreatedResponse({
    description: 'Movimiento y saldos en el envelope estándar {data, error}.',
    schema: {
      type: 'object',
      properties: {
        data: {type: 'object'},
        error: {type: 'null', nullable: true, example: null},
      },
    },
  })
  @ApiBadRequestResponse({description: 'Cuerpo inválido; `amount` debe ser un entero ≥ 1.'})
  @ApiNotFoundResponse({description: 'La cuenta o categoría no existe o pertenece a otro usuario.'})
  @ApiConflictResponse({
    description: 'Transferencia sin destino, saldo negativo no permitido o período cerrado.',
  })
  @ApiUnprocessableEntityResponse({
    description: 'El destino es la propia cuenta o la categoría no acepta el tipo.',
  })
  @ApiUnauthorizedResponse({description: 'Falta un token de acceso válido.'})
  @ApiTooManyRequestsResponse({description: 'Límite de mutaciones excedido.'})
  create(
    @CurrentUser() publicId: string,
    @Body() request: CreateMovementRequestDto,
  ): Promise<CreateMovementResponseDto> {
    return this.movements.create(publicId, request);
  }
}
