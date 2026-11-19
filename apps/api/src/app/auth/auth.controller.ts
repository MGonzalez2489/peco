import {Body, Controller, HttpCode, HttpStatus, Post} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {AuthService} from './auth.service';
import {AuthResponseDto} from './dto/auth-response.dto';
import {LoginRequestDto} from './dto/login-request.dto';
import {RefreshRequestDto} from './dto/refresh-request.dto';
import {RegisterRequestDto} from './dto/register-request.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({summary: 'Registrar un usuario, crear su cuenta raíz e iniciar sesión'})
  @ApiCreatedResponse({type: AuthResponseDto, description: 'Usuario creado y autenticado.'})
  @ApiBadRequestResponse({description: 'Datos de registro no válidos.'})
  @ApiConflictResponse({description: 'El correo ya está registrado.'})
  register(@Body() body: RegisterRequestDto): Promise<AuthResponseDto> {
    return this.authService.register(body);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({summary: 'Iniciar sesión con correo y contraseña'})
  @ApiOkResponse({type: AuthResponseDto, description: 'Sesión iniciada.'})
  @ApiBadRequestResponse({description: 'Datos de inicio de sesión no válidos.'})
  @ApiUnauthorizedResponse({description: 'El correo o la contraseña no son correctos.'})
  login(@Body() body: LoginRequestDto): Promise<AuthResponseDto> {
    return this.authService.login(body);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({summary: 'Renovar el par de tokens con un token de renovación'})
  @ApiOkResponse({type: AuthResponseDto, description: 'Nuevo par de tokens emitido.'})
  @ApiBadRequestResponse({description: 'Datos de renovación no válidos.'})
  @ApiUnauthorizedResponse({
    description: 'Token desconocido, expirado o reutilizado; la familia queda revocada.',
  })
  refresh(@Body() body: RefreshRequestDto): Promise<AuthResponseDto> {
    return this.authService.refresh(body);
  }
}
