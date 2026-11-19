import type {RefreshRequest} from '@peco/contracts';
import {ApiProperty} from '@nestjs/swagger';
import {IsString, Length} from 'class-validator';

/** Refresh body (8.6). The opaque token is never persisted in plain text. */
export class RefreshRequestDto implements RefreshRequest {
  @ApiProperty({
    example: 'opaque-refresh-token',
    minLength: 1,
    maxLength: 512,
    description: 'Token de renovación opaco entregado por register, login o refresh.',
  })
  @IsString()
  @Length(1, 512)
  refreshToken!: string;
}
