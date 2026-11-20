import {Controller, Get, UseGuards} from '@nestjs/common';
import {
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
import {EnvelopeResult} from '../common/http/envelope-result';
import {CurrentUser} from '../common/security/decorators/current-user.decorator';
import {RateLimited} from '../common/security/decorators/rate-limited.decorator';
import {AccountsService} from './accounts.service';
import {AccountResponseDto} from './dto/account-response.dto';
import {AccountSummaryDto} from './dto/account-summary.dto';

/** Authenticated account reads; the principal comes from the global access guard (D86). */
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
    description: 'Cuentas del usuario con sus totales calculados en `meta.summary`.',
    schema: {
      type: 'object',
      properties: {
        data: {type: 'array', items: {type: 'object'}},
        meta: {type: 'object'},
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
}
