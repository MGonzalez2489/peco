import type {RegisterRequest} from '@peco/contracts';
import {ApiProperty} from '@nestjs/swagger';
import {Transform} from 'class-transformer';
import {IsEmail, IsString, Length} from 'class-validator';

/** Registration body (8.6). Emails are normalized before validation and use. */
export class RegisterRequestDto implements RegisterRequest {
  @ApiProperty({
    example: 'user@example.com',
    minLength: 5,
    maxLength: 254,
    description: 'Correo electrónico; se normaliza a minúsculas y sin espacios.',
  })
  @Transform(({value}) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsString()
  @IsEmail()
  @Length(5, 254)
  email!: string;

  @ApiProperty({
    example: 'correct horse battery',
    minLength: 8,
    maxLength: 128,
    description: 'Contraseña de 8 a 128 caracteres, sin reglas de composición.',
  })
  @IsString()
  @Length(8, 128)
  password!: string;

  @ApiProperty({
    example: 'Manuel',
    minLength: 1,
    maxLength: 80,
    description: 'Nombre visible del usuario.',
  })
  @IsString()
  @Length(1, 80)
  name!: string;
}
