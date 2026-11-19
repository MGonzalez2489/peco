import {Body, Controller, HttpCode, HttpStatus, Post, UseGuards} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {SkipThrottle, Throttle} from '@nestjs/throttler';
import {RATE_LIMITS} from '../common/constants/rate-limits.constant';
import {Public} from '../common/security/decorators/public.decorator';
import {RateLimited} from '../common/security/decorators/rate-limited.decorator';
import {AuthService} from './auth.service';
import {AuthRateLimitGuard} from './guards/auth-rate-limit.guard';
import {AuthResponseDto} from './dto/auth-response.dto';
import {ForgotPasswordRequestDto} from './dto/forgot-password-request.dto';
import {LoginRequestDto} from './dto/login-request.dto';
import {RefreshRequestDto} from './dto/refresh-request.dto';
import {RegisterRequestDto} from './dto/register-request.dto';
import {ResetPasswordRequestDto} from './dto/reset-password-request.dto';

@ApiTags('auth')
@Controller('auth')
@UseGuards(AuthRateLimitGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Public()
  @RateLimited()
  @Throttle({
    ip: {limit: RATE_LIMITS.register.ip.limit, ttl: RATE_LIMITS.register.ip.ttl},
    identity: {limit: RATE_LIMITS.register.identity.limit, ttl: RATE_LIMITS.register.identity.ttl},
  })
  @ApiOperation({summary: 'Registrar un usuario, crear su cuenta raíz e iniciar sesión'})
  @ApiCreatedResponse({type: AuthResponseDto, description: 'Usuario creado y autenticado.'})
  @ApiBadRequestResponse({description: 'Datos de registro no válidos.'})
  @ApiConflictResponse({description: 'El correo ya está registrado.'})
  @ApiTooManyRequestsResponse({description: 'Límite de registro excedido.'})
  register(@Body() body: RegisterRequestDto): Promise<AuthResponseDto> {
    return this.authService.register(body);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Public()
  @RateLimited()
  @Throttle({
    ip: {limit: RATE_LIMITS.login.ip.limit, ttl: RATE_LIMITS.login.ip.ttl},
    identity: {limit: RATE_LIMITS.login.identity.limit, ttl: RATE_LIMITS.login.identity.ttl},
  })
  @ApiOperation({summary: 'Iniciar sesión con correo y contraseña'})
  @ApiOkResponse({type: AuthResponseDto, description: 'Sesión iniciada.'})
  @ApiBadRequestResponse({description: 'Datos de inicio de sesión no válidos.'})
  @ApiUnauthorizedResponse({description: 'El correo o la contraseña no son correctos.'})
  @ApiTooManyRequestsResponse({description: 'Límite de inicio de sesión excedido.'})
  login(@Body() body: LoginRequestDto): Promise<AuthResponseDto> {
    return this.authService.login(body);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Public()
  @ApiOperation({summary: 'Renovar el par de tokens con un token de renovación'})
  @ApiOkResponse({type: AuthResponseDto, description: 'Nuevo par de tokens emitido.'})
  @ApiBadRequestResponse({description: 'Datos de renovación no válidos.'})
  @ApiUnauthorizedResponse({
    description: 'Token desconocido, expirado o reutilizado; la familia queda revocada.',
  })
  refresh(@Body() body: RefreshRequestDto): Promise<AuthResponseDto> {
    return this.authService.refresh(body);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({summary: 'Cerrar la sesión revocando el token de renovación'})
  @ApiNoContentResponse({description: 'Sesión revocada. Respuesta sin cuerpo.'})
  @ApiBadRequestResponse({description: 'Datos de cierre de sesión no válidos.'})
  @ApiUnauthorizedResponse({description: 'Falta un token de acceso válido.'})
  logout(@Body() body: RefreshRequestDto): Promise<void> {
    return this.authService.logout(body);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Public()
  @RateLimited()
  @Throttle({
    ip: {limit: RATE_LIMITS.forgotPassword.ip.limit, ttl: RATE_LIMITS.forgotPassword.ip.ttl},
    identity: {
      limit: RATE_LIMITS.forgotPassword.identity.limit,
      ttl: RATE_LIMITS.forgotPassword.identity.ttl,
    },
  })
  @ApiOperation({summary: 'Solicitar un enlace de recuperación de contraseña'})
  @ApiNoContentResponse({description: 'Solicitud aceptada. Respuesta sin cuerpo.'})
  @ApiBadRequestResponse({description: 'Datos de recuperación no válidos.'})
  @ApiTooManyRequestsResponse({description: 'Límite de recuperación excedido.'})
  forgotPassword(@Body() body: ForgotPasswordRequestDto): Promise<void> {
    return this.authService.forgotPassword(body);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Public()
  @RateLimited()
  @SkipThrottle({identity: true})
  @Throttle({
    ip: {limit: RATE_LIMITS.resetPassword.ip.limit, ttl: RATE_LIMITS.resetPassword.ip.ttl},
  })
  @ApiOperation({summary: 'Restablecer la contraseña con un token de un solo uso'})
  @ApiNoContentResponse({description: 'Contraseña actualizada. Respuesta sin cuerpo.'})
  @ApiBadRequestResponse({description: 'Token no válido, usado o expirado, o datos no válidos.'})
  @ApiTooManyRequestsResponse({description: 'Límite de restablecimiento excedido.'})
  resetPassword(@Body() body: ResetPasswordRequestDto): Promise<void> {
    return this.authService.resetPassword(body);
  }
}
