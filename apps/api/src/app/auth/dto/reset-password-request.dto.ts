import type {ResetPasswordRequest} from '@peco/contracts';
import {ApiProperty} from '@nestjs/swagger';
import {IsString, Length} from 'class-validator';

/** Reset-password body (8.6): a single-use token and the new password. */
export class ResetPasswordRequestDto implements ResetPasswordRequest {
  @ApiProperty({
    example: 'single-use-token',
    description: 'Token de un solo uso recibido por correo.',
  })
  @IsString()
  @Length(1, 512)
  token!: string;

  @ApiProperty({
    example: 'correct horse battery',
    minLength: 8,
    maxLength: 128,
    description: 'Contraseña nueva de 8 a 128 caracteres.',
  })
  @IsString()
  @Length(8, 128)
  newPassword!: string;
}
