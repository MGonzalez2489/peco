import {Body, Controller, Delete, HttpCode, HttpStatus, Patch} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type {UserResponse} from '@peco/contracts';
import {UserResponseDto} from '../common/dto/user-response.dto';
import {CurrentUser} from '../common/security/decorators/current-user.decorator';
import {DeleteUserRequestDto} from './dto/delete-user-request.dto';
import {UpdateUserRequestDto} from './dto/update-user-request.dto';
import {UsersService} from './users.service';

/** Authenticated user routes; the principal comes from the global access guard (D86/D87). */
@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({summary: 'Actualizar el nombre del usuario autenticado'})
  @ApiOkResponse({type: UserResponseDto, description: 'Perfil actualizado.'})
  @ApiBadRequestResponse({description: 'El nombre no tiene entre 1 y 80 caracteres.'})
  @ApiUnauthorizedResponse({description: 'Falta un token de acceso válido.'})
  @ApiNotFoundResponse({description: 'El usuario ya no está activo.'})
  update(
    @CurrentUser() publicId: string,
    @Body() body: UpdateUserRequestDto,
  ): Promise<UserResponse> {
    return this.users.update(publicId, body);
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({summary: 'Eliminar la cuenta del usuario autenticado'})
  @ApiNoContentResponse({description: 'Cuenta eliminada. Respuesta sin cuerpo.'})
  @ApiBadRequestResponse({description: 'La contraseña no tiene entre 8 y 128 caracteres.'})
  @ApiUnauthorizedResponse({description: 'Token no válido o contraseña incorrecta.'})
  @ApiNotFoundResponse({description: 'El usuario ya no está activo.'})
  remove(@CurrentUser() publicId: string, @Body() body: DeleteUserRequestDto): Promise<void> {
    return this.users.remove(publicId, body);
  }
}
