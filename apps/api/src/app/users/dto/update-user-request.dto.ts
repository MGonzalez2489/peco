import type {UpdateUserRequest} from '@peco/contracts';
import {ApiPropertyOptional} from '@nestjs/swagger';
import {IsString, Length, ValidateIf} from 'class-validator';

/** Profile patch body (8.7). `null` is invalid; an omitted name is a no-op. */
export class UpdateUserRequestDto implements UpdateUserRequest {
  @ApiPropertyOptional({
    example: 'Manuel',
    minLength: 1,
    maxLength: 80,
    description: 'Nombre visible del usuario, de 1 a 80 caracteres.',
  })
  @ValidateIf((_dto: unknown, value: unknown) => value !== undefined)
  @IsString()
  @Length(1, 80)
  name?: string;
}
