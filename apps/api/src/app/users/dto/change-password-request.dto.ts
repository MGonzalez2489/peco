import type {ChangePasswordRequest} from '@peco/contracts';
import {ApiProperty} from '@nestjs/swagger';
import {IsString, Length} from 'class-validator';

/** Password-change body; both secrets follow the 8–128 char rule of 8.15. */
export class ChangePasswordRequestDto implements ChangePasswordRequest {
  @ApiProperty({
    example: 'correct horse battery',
    minLength: 8,
    maxLength: 128,
    description: 'Contraseña actual del usuario, de 8 a 128 caracteres.',
  })
  @IsString()
  @Length(8, 128)
  currentPassword!: string;

  @ApiProperty({
    example: 'a new correct horse',
    minLength: 8,
    maxLength: 128,
    description: 'Nueva contraseña del usuario, de 8 a 128 caracteres.',
  })
  @IsString()
  @Length(8, 128)
  newPassword!: string;
}
