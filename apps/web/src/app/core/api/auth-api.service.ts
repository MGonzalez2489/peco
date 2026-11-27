import {Injectable, inject} from '@angular/core';
import type {
  AuthResponse,
  ForgotPasswordRequest,
  LoginRequest,
  RefreshRequest,
  RegisterRequest,
  ResetPasswordRequest,
} from '@peco/contracts';
import {Observable} from 'rxjs';
import {ApiClientService} from './api-client.service';

@Injectable({providedIn: 'root'})
export class AuthApiService {
  private readonly api = inject(ApiClientService);

  register(body: RegisterRequest): Observable<AuthResponse> {
    return this.api.post('auth/register', body);
  }

  login(body: LoginRequest): Observable<AuthResponse> {
    return this.api.post('auth/login', body);
  }

  refresh(body: RefreshRequest): Observable<AuthResponse> {
    return this.api.post('auth/refresh', body);
  }

  logout(body: RefreshRequest): Observable<void> {
    return this.api.postVoid('auth/logout', body);
  }

  forgotPassword(body: ForgotPasswordRequest): Observable<void> {
    return this.api.postVoid('auth/forgot-password', body);
  }

  resetPassword(body: ResetPasswordRequest): Observable<void> {
    return this.api.postVoid('auth/reset-password', body);
  }
}
