import type {UserResponse} from '@peco/contracts';
import {ApiProperty} from '@nestjs/swagger';

/** Public user shape; the internal numeric `id` is never included (D9/D87). */
export class UserResponseDto implements UserResponse {
  @ApiProperty({description: 'Identificador público del usuario.'})
  readonly publicId: string;

  @ApiProperty({description: 'Correo electrónico normalizado.'})
  readonly email: string;

  @ApiProperty({description: 'Nombre visible del usuario.'})
  readonly name: string;

  @ApiProperty({description: 'Fecha de creación en UTC.'})
  readonly createdAt: string;

  @ApiProperty({description: 'Fecha de última actualización en UTC.'})
  readonly updatedAt: string;

  constructor(user: UserResponse) {
    this.publicId = user.publicId;
    this.email = user.email;
    this.name = user.name;
    this.createdAt = user.createdAt;
    this.updatedAt = user.updatedAt;
  }
}
