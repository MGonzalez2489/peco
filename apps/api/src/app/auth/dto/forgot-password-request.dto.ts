import type {ForgotPasswordRequest} from '@peco/contracts';
import {ApiProperty} from '@nestjs/swagger';
import {Transform} from 'class-transformer';
import {IsEmail, IsString, Length} from 'class-validator';

/** Forgot-password body (8.6). Always answered with 204, even for unknown emails. */
export class ForgotPasswordRequestDto implements ForgotPasswordRequest {
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
}
