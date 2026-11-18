import type {UserResponse} from './user-response.type';

/** Auto-login payload returned by register and login (8.6/D44). */
export interface AuthResponse {
  user: UserResponse;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}
