import {Body, Controller, Post, UseGuards} from '@nestjs/common';
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
import {RateLimited} from '../common/security/decorators/rate-limited.decorator';
import {CurrentUser} from '../common/security/decorators/current-user.decorator';
import {CreateScheduledTransactionRequestDto} from './dto/create-scheduled-transaction-request.dto';
import {ScheduledTransactionResponseDto} from './dto/scheduled-transaction-response.dto';
import {ScheduledTransactionsService} from './scheduled-transactions.service';

/** Authenticated schedule creation (US-601). */
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
}
