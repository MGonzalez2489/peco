import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {SkipThrottle, Throttle} from '@nestjs/throttler';
import type {UserResponse} from '@peco/contracts';
import {AuthRateLimitGuard} from '../auth/guards/auth-rate-limit.guard';
import {RATE_LIMITS} from '../common/constants/rate-limits.constant';
import {UserResponseDto} from '../common/dto/user-response.dto';
import {EnvelopeStream} from '../common/http/envelope-stream';
import {CurrentUser} from '../common/security/decorators/current-user.decorator';
import {RateLimited} from '../common/security/decorators/rate-limited.decorator';
import type {CorrelatedRequest} from '../common/types/correlated-request.type';
import {ChangePasswordRequestDto} from './dto/change-password-request.dto';
import {DeleteUserRequestDto} from './dto/delete-user-request.dto';
import {UpdateUserRequestDto} from './dto/update-user-request.dto';
import {UserDataExportService} from './services/user-data-export.service';
import {UsersService} from './users.service';

/** Authenticated user routes; the principal comes from the global access guard (D86). */
@ApiTags('users')
@Controller('users')
@UseGuards(AuthRateLimitGuard)
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly exports: UserDataExportService,
  ) {}

  @Get('me/export')
  @RateLimited()
  // The shared guard evaluates every named throttler; only the read policy applies (13.1).
  @SkipThrottle({ip: true, identity: true, user: true})
  @Throttle({
    read: {limit: RATE_LIMITS.read.user.limit, ttl: RATE_LIMITS.read.user.ttl},
  })
  @Header('Content-Type', 'application/json; charset=utf-8')
  @ApiOperation({summary: 'Exportar todos los datos del usuario autenticado'})
  @ApiProduces('application/json')
  @ApiOkResponse({
    description: 'Documento JSON con los datos del usuario. Incluye el envelope estándar.',
    schema: {type: 'object'},
  })
  @ApiUnauthorizedResponse({description: 'Falta un token de acceso válido.'})
  @ApiNotFoundResponse({description: 'El usuario ya no está activo.'})
  @ApiTooManyRequestsResponse({description: 'Límite de lecturas excedido.'})
  exportData(
    @CurrentUser() publicId: string,
    @Req() request: CorrelatedRequest,
  ): Promise<EnvelopeStream> {
    return this.exports.exportData(publicId, request.correlationId);
  }

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  @RateLimited()
  // The shared guard evaluates every named throttler; only the user policy applies (13.1).
  @SkipThrottle({ip: true, identity: true, read: true})
  @Throttle({
    user: {limit: RATE_LIMITS.mutation.user.limit, ttl: RATE_LIMITS.mutation.user.ttl},
  })
  @ApiOperation({summary: 'Actualizar el nombre del usuario autenticado'})
  @ApiOkResponse({type: UserResponseDto, description: 'Perfil actualizado.'})
  @ApiBadRequestResponse({description: 'El nombre no tiene entre 1 y 80 caracteres.'})
  @ApiUnauthorizedResponse({description: 'Falta un token de acceso válido.'})
  @ApiNotFoundResponse({description: 'El usuario ya no está activo.'})
  @ApiTooManyRequestsResponse({description: 'Límite de actualizaciones de perfil excedido.'})
  update(
    @CurrentUser() publicId: string,
    @Body() body: UpdateUserRequestDto,
  ): Promise<UserResponse> {
    return this.users.update(publicId, body);
  }

  @Patch('me/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RateLimited()
  // The shared guard evaluates every named throttler; only the user policy applies (13.1).
  @SkipThrottle({ip: true, identity: true, read: true})
  @Throttle({
    user: {limit: RATE_LIMITS.mutation.user.limit, ttl: RATE_LIMITS.mutation.user.ttl},
  })
  @ApiOperation({summary: 'Cambiar la contraseña del usuario autenticado'})
  @ApiNoContentResponse({description: 'Contraseña actualizada. Respuesta sin cuerpo.'})
  @ApiBadRequestResponse({description: 'Las contraseñas no tienen entre 8 y 128 caracteres.'})
  @ApiUnauthorizedResponse({description: 'Token no válido o contraseña actual incorrecta.'})
  @ApiTooManyRequestsResponse({description: 'Límite de cambios de contraseña excedido.'})
  changePassword(
    @CurrentUser() publicId: string,
    @Body() body: ChangePasswordRequestDto,
  ): Promise<void> {
    return this.users.changePassword(publicId, body);
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RateLimited()
  // The shared guard evaluates every named throttler; only the user policy applies (13.1).
  @SkipThrottle({ip: true, identity: true, read: true})
  @Throttle({
    user: {limit: RATE_LIMITS.mutation.user.limit, ttl: RATE_LIMITS.mutation.user.ttl},
  })
  @ApiOperation({summary: 'Eliminar la cuenta del usuario autenticado'})
  @ApiNoContentResponse({description: 'Cuenta eliminada. Respuesta sin cuerpo.'})
  @ApiBadRequestResponse({description: 'La contraseña no tiene entre 8 y 128 caracteres.'})
  @ApiUnauthorizedResponse({description: 'Token no válido o contraseña incorrecta.'})
  @ApiNotFoundResponse({description: 'El usuario ya no está activo.'})
  @ApiTooManyRequestsResponse({description: 'Límite de eliminaciones de cuenta excedido.'})
  remove(@CurrentUser() publicId: string, @Body() body: DeleteUserRequestDto): Promise<void> {
    return this.users.remove(publicId, body);
  }
}
