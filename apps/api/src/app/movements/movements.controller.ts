import {Body, Controller, HttpCode, HttpStatus, Post, UseGuards} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import {SkipThrottle, Throttle} from '@nestjs/throttler';
import {AuthRateLimitGuard} from '../auth/guards/auth-rate-limit.guard';
import {RATE_LIMITS} from '../common/constants/rate-limits.constant';
import {CurrentUser} from '../common/security/decorators/current-user.decorator';
import {RateLimited} from '../common/security/decorators/rate-limited.decorator';
import {CreateMovementRequestDto} from './dto/create-movement-request.dto';
import {CreateMovementResponseDto} from './dto/create-movement-response.dto';
import {MovementsService} from './movements.service';

/** Authenticated ledger mutations (US-501). */
@ApiTags('movements')
@Controller('movements')
@UseGuards(AuthRateLimitGuard)
export class MovementsController {
  constructor(private readonly movements: MovementsService) {}

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
