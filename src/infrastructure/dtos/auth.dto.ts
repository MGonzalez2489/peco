export interface LoginDto {
  email: string;
  password: string;
}

export interface TokenDto {
  access_token: string;
  expiresAt: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}
