import {Body, Controller, HttpCode, HttpStatus, Post} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {AuthService} from './auth.service';
import {AuthResponseDto} from './dto/auth-response.dto';
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
}
