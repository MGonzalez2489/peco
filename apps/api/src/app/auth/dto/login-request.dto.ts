import type {LoginRequest} from '@peco/contracts';
import {ApiProperty} from '@nestjs/swagger';
import {Transform} from 'class-transformer';
import {IsEmail, IsString, Length} from 'class-validator';

/** Login body (8.6). Emails are normalized before validation and lookup. */
export class LoginRequestDto implements LoginRequest {
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
    description: 'Contraseña de 8 a 128 caracteres.',
  })
  @IsString()
  @Length(8, 128)
  password!: string;
}
