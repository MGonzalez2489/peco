import type {DeleteUserRequest} from '@peco/contracts';
import {ApiProperty} from '@nestjs/swagger';
import {IsString, Length} from 'class-validator';

/** Password confirmation required before an account can be deleted (8.7). */
export class DeleteUserRequestDto implements DeleteUserRequest {
  @ApiProperty({
    example: 'correct horse battery',
    minLength: 8,
    maxLength: 128,
    description: 'Contraseña actual del usuario, de 8 a 128 caracteres.',
  })
  @IsString()
  @Length(8, 128)
  password!: string;
}
