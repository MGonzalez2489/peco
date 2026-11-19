import {Injectable} from '@nestjs/common';
import type {DeleteUserRequest, UpdateUserRequest} from '@peco/contracts';
import {PasswordHasher} from '../auth/services/password-hasher';
import {invalidCredentialsException} from '../auth/utils/invalid-credentials.exception';
import {UserResponseDto} from '../common/dto/user-response.dto';
import {UserDeletionRepository} from './services/user-deletion.repository';
import {UserProfileRepository} from './services/user-profile.repository';
import {userNotFoundException} from './utils/user-not-found.exception';

/** Profile update and password-confirmed account deletion (8.7/D87). */
@Injectable()
export class UsersService {
  constructor(
    private readonly profile: UserProfileRepository,
    private readonly deletion: UserDeletionRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async update(publicId: string, request: UpdateUserRequest): Promise<UserResponseDto> {
    const user =
      request.name === undefined
        ? await this.profile.findActiveByPublicId(publicId)
        : await this.profile.updateName(publicId, request.name);
    if (!user) {
      throw userNotFoundException();
    }

    return new UserResponseDto(user);
  }

  async remove(publicId: string, request: DeleteUserRequest): Promise<void> {
    const user = await this.profile.findActiveByPublicId(publicId);
    if (!user) {
      throw userNotFoundException();
    }

    if (!(await this.passwordHasher.verify(user.passwordHash, request.password))) {
      throw invalidCredentialsException();
    }

    if (!(await this.deletion.delete(publicId))) {
      throw userNotFoundException();
    }
  }
}
