import {Body, Controller, Get, HttpCode, HttpStatus, Patch, UseGuards} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
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
import {CurrentUser} from '../common/security/decorators/current-user.decorator';
import {RateLimited} from '../common/security/decorators/rate-limited.decorator';
import {PreferencesResponseDto} from './dto/preferences-response.dto';
import {UpdatePreferencesRequestDto} from './dto/update-preferences-request.dto';
import {PreferencesService} from './services/preferences.service';

/** Authenticated preferences routes; the principal comes from the global access guard. */
@ApiTags('preferences')
@Controller('preferences')
@UseGuards(AuthRateLimitGuard)
export class PreferencesController {
  constructor(private readonly preferences: PreferencesService) {}

  @Get()
  @RateLimited()
  // The shared guard evaluates every named throttler; only the read policy applies (13.1).
  @SkipThrottle({ip: true, identity: true, user: true})
  @Throttle({
    read: {limit: RATE_LIMITS.read.user.limit, ttl: RATE_LIMITS.read.user.ttl},
  })
  @ApiOperation({summary: 'Obtener las preferencias del usuario autenticado'})
  @ApiOkResponse({
    type: PreferencesResponseDto,
    description: 'Preferencias en el envelope estándar {data, error}.',
  })
  @ApiUnauthorizedResponse({description: 'Falta un token de acceso válido.'})
  @ApiNotFoundResponse({description: 'El usuario ya no está activo.'})
  @ApiTooManyRequestsResponse({description: 'Límite de lecturas excedido.'})
  async get(@CurrentUser() publicId: string): Promise<PreferencesResponseDto> {
    return new PreferencesResponseDto(await this.preferences.find(publicId));
  }

  @Patch()
  @HttpCode(HttpStatus.OK)
  @RateLimited()
  // The shared guard evaluates every named throttler; only the user policy applies (13.1).
  @SkipThrottle({ip: true, identity: true, read: true})
  @Throttle({
    user: {limit: RATE_LIMITS.mutation.user.limit, ttl: RATE_LIMITS.mutation.user.ttl},
  })
  @ApiOperation({summary: 'Combinar parcialmente las preferencias del usuario autenticado'})
  @ApiBody({type: UpdatePreferencesRequestDto})
  @ApiOkResponse({
    type: PreferencesResponseDto,
    description: 'Preferencias resultantes en el envelope estándar {data, error}.',
  })
  @ApiBadRequestResponse({description: 'El cuerpo contiene campos desconocidos o valores no válidos.'})
  @ApiUnauthorizedResponse({description: 'Falta un token de acceso válido.'})
  @ApiNotFoundResponse({description: 'El usuario ya no está activo.'})
  @ApiTooManyRequestsResponse({description: 'Límite de actualizaciones excedido.'})
  async patch(
    @CurrentUser() publicId: string,
    @Body() body: UpdatePreferencesRequestDto,
  ): Promise<PreferencesResponseDto> {
    return new PreferencesResponseDto(await this.preferences.update(publicId, body));
  }
}
