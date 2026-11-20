import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
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
} from '@nestjs/swagger';
import {SkipThrottle, Throttle} from '@nestjs/throttler';
import {AuthRateLimitGuard} from '../auth/guards/auth-rate-limit.guard';
import {RATE_LIMITS} from '../common/constants/rate-limits.constant';
import {EnvelopeResult} from '../common/http/envelope-result';
import {CurrentUser} from '../common/security/decorators/current-user.decorator';
import {RateLimited} from '../common/security/decorators/rate-limited.decorator';
import {AccountsService} from './accounts.service';
import {AccountResponseDto} from './dto/account-response.dto';
import {AccountSummaryDto} from './dto/account-summary.dto';
import {CreateAccountRequestDto} from './dto/create-account-request.dto';
import {UpdateAccountRequestDto} from './dto/update-account-request.dto';

/** Authenticated account reads, detail, metadata updates and non-root creation (D86/US-303). */
@ApiTags('accounts')
@Controller('accounts')
@UseGuards(AuthRateLimitGuard)
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Get()
  @RateLimited()
  // The shared guard evaluates every named throttler; only the read policy applies (13.1).
  @SkipThrottle({ip: true, identity: true, user: true})
  @Throttle({
    read: {limit: RATE_LIMITS.read.user.limit, ttl: RATE_LIMITS.read.user.ttl},
  })
  @ApiOperation({summary: 'Listar las cuentas del usuario autenticado'})
  @ApiOkResponse({
    description:
      'Lista en el envelope estándar {data, meta, error}; los totales van en `meta.summary`.',
    schema: {
      type: 'object',
      properties: {
        data: {type: 'array', items: {type: 'object'}},
        meta: {
          type: 'object',
          properties: {
            correlationId: {type: 'string'},
            summary: {type: 'object'},
          },
        },
        error: {type: 'null', nullable: true, example: null},
      },
    },
  })
  @ApiUnauthorizedResponse({description: 'Falta un token de acceso válido.'})
  @ApiNotFoundResponse({description: 'El usuario ya no está activo.'})
  @ApiTooManyRequestsResponse({description: 'Límite de lecturas excedido.'})
  async list(
    @CurrentUser() publicId: string,
  ): Promise<EnvelopeResult<AccountResponseDto[], {summary: AccountSummaryDto}>> {
    const {items, summary} = await this.accounts.list(publicId);

    return EnvelopeResult.withMeta(items, {summary});
  }

  @Get(':publicId')
  @RateLimited()
  // The shared guard evaluates every named throttler; only the read policy applies (13.1).
  @SkipThrottle({ip: true, identity: true, user: true})
  @Throttle({
    read: {limit: RATE_LIMITS.read.user.limit, ttl: RATE_LIMITS.read.user.ttl},
  })
  @ApiOperation({summary: 'Obtener el detalle de una cuenta propia'})
  @ApiParam({name: 'publicId', description: 'Identificador público de la cuenta.'})
  @ApiOkResponse({
    description: 'Cuenta en el envelope estándar {data, error}.',
    schema: {
      type: 'object',
      properties: {
        data: {type: 'object'},
        error: {type: 'null', nullable: true, example: null},
      },
    },
  })
  @ApiUnauthorizedResponse({description: 'Falta un token de acceso válido.'})
  @ApiNotFoundResponse({description: 'La cuenta no existe o pertenece a otro usuario.'})
  @ApiTooManyRequestsResponse({description: 'Límite de lecturas excedido.'})
  findOne(
    @CurrentUser() publicId: string,
    @Param('publicId') accountPublicId: string,
  ): Promise<AccountResponseDto> {
    return this.accounts.findOne(publicId, accountPublicId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RateLimited()
  // The shared guard evaluates every named throttler; only the user policy applies (13.1).
  @SkipThrottle({ip: true, identity: true, read: true})
  @Throttle({
    user: {limit: RATE_LIMITS.mutation.user.limit, ttl: RATE_LIMITS.mutation.user.ttl},
  })
  @ApiOperation({summary: 'Crear una cuenta no principal'})
  @ApiCreatedResponse({
    description: 'Cuenta creada en el envelope estándar {data, error}.',
    schema: {
      type: 'object',
      properties: {
        data: {type: 'object'},
        error: {type: 'null', nullable: true, example: null},
      },
    },
  })
  @ApiBadRequestResponse({description: 'Cuerpo inválido o saldo inicial negativo no permitido.'})
  @ApiUnauthorizedResponse({description: 'Falta un token de acceso válido.'})
  @ApiNotFoundResponse({description: 'El usuario ya no está activo.'})
  @ApiTooManyRequestsResponse({description: 'Límite de mutaciones excedido.'})
  create(
    @CurrentUser() publicId: string,
    @Body() request: CreateAccountRequestDto,
  ): Promise<AccountResponseDto> {
    return this.accounts.create(publicId, request);
  }

  @Patch(':publicId')
  @RateLimited()
  // The shared guard evaluates every named throttler; only the user policy applies (13.1).
  @SkipThrottle({ip: true, identity: true, read: true})
  @Throttle({
    user: {limit: RATE_LIMITS.mutation.user.limit, ttl: RATE_LIMITS.mutation.user.ttl},
  })
  @ApiOperation({summary: 'Actualizar los metadatos de una cuenta propia'})
  @ApiParam({name: 'publicId', description: 'Identificador público de la cuenta.'})
  @ApiOkResponse({
    description: 'Cuenta actualizada en el envelope estándar {data, error}.',
    schema: {
      type: 'object',
      properties: {
        data: {type: 'object'},
        error: {type: 'null', nullable: true, example: null},
      },
    },
  })
  @ApiBadRequestResponse({description: 'Cuerpo inválido o límite de crédito no permitido.'})
  @ApiNotFoundResponse({description: 'La cuenta no existe o pertenece a otro usuario.'})
  @ApiConflictResponse({
    description: 'Versión obsoleta o cambio de tipo que dejaría un saldo negativo.',
  })
  @ApiUnauthorizedResponse({description: 'Falta un token de acceso válido.'})
  @ApiTooManyRequestsResponse({description: 'Límite de mutaciones excedido.'})
  update(
    @CurrentUser() publicId: string,
    @Param('publicId') accountPublicId: string,
    @Body() request: UpdateAccountRequestDto,
  ): Promise<AccountResponseDto> {
    return this.accounts.update(publicId, accountPublicId, request);
  }
}
