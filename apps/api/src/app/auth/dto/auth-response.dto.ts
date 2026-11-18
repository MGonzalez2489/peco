import type {AuthResponse} from '@peco/contracts';
import {ApiProperty} from '@nestjs/swagger';
import {UserResponseDto} from './user-response.dto';

/** Auto-login payload returned by registration (8.6/D44). */
export class AuthResponseDto implements AuthResponse {
  @ApiProperty({type: UserResponseDto})
  readonly user: UserResponseDto;

  @ApiProperty({description: 'JWT de acceso de corta duración.'})
  readonly accessToken: string;

  @ApiProperty({description: 'Token de renovación opaco, almacenado solo como hash.'})
  readonly refreshToken: string;

  @ApiProperty({description: 'Vigencia del token de acceso en segundos.', minimum: 1})
  readonly expiresIn: number;

  @ApiProperty({description: 'Vigencia del token de renovación en segundos.', minimum: 1})
  readonly refreshExpiresIn: number;

  constructor(response: AuthResponse) {
    this.user = new UserResponseDto(response.user);
    this.accessToken = response.accessToken;
    this.refreshToken = response.refreshToken;
    this.expiresIn = response.expiresIn;
    this.refreshExpiresIn = response.refreshExpiresIn;
  }
}
