import {Injectable, inject} from '@angular/core';
import type {
  ChangePasswordRequest,
  DeleteUserRequest,
  UpdateUserRequest,
  UserDataExport,
  UserResponse,
} from '@peco/contracts';
import {Observable} from 'rxjs';
import {ApiClientService} from './api-client.service';

@Injectable({providedIn: 'root'})
export class UsersApiService {
  private readonly api = inject(ApiClientService);

  exportData(): Observable<UserDataExport> {
    return this.api.get('users/me/export');
  }

  updateProfile(body: UpdateUserRequest): Observable<UserResponse> {
    return this.api.patch('users/me', body);
  }

  changePassword(body: ChangePasswordRequest): Observable<void> {
    return this.api.patchVoid('users/me/password', body);
  }

  deleteUser(body: DeleteUserRequest): Observable<void> {
    return this.api.deleteVoid('users/me', {body});
  }
}
