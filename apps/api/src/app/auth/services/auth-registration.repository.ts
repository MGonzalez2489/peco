import {Injectable} from '@nestjs/common';
import {AccountTypeEnum} from '@peco/enums';
import {DataSource, IsNull} from 'typeorm';
import {
  AccountEntity,
  RefreshTokenEntity,
  UserEntity,
  UserPreferencesEntity,
} from '../../database/entities';
import {DEFAULT_USER_DATA_EXPORT_PREFERENCES} from '../../users/constants/default-user-data-export-preferences.constant';
import {ROOT_ACCOUNT_NAME} from '../constants/root-account-name.constant';
import type {RegistrationInput} from '../types/registration-input.type';
import {duplicateEmailException} from '../utils/duplicate-email.exception';
import {isDuplicateEmailError} from '../utils/is-duplicate-email-error.util';

/**
 * Owns the single registration transaction: user, root account, refresh token and
 * canonical preferences are written together, so a failed insert leaves no user
 * behind (D35/D132).
 */
@Injectable()
export class AuthRegistrationRepository {
  constructor(private readonly dataSource: DataSource) {}

  async create(input: RegistrationInput): Promise<UserEntity> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const existing = await manager
          .getRepository(UserEntity)
          .findOne({where: {email: input.email}});
        if (existing) {
          throw duplicateEmailException();
        }

        const user = await manager.save(
          manager.create(UserEntity, {
            email: input.email,
            passwordHash: input.passwordHash,
            name: input.name,
            lastActiveAt: null,
            deletedAt: null,
          }),
        );

        // Defensive invariant check (7.4/D35): a second active root would break
        // UQAccountsRootKey, so abort the whole transaction before writing it.
        const existingRoot = await manager.findOne(AccountEntity, {
          where: {userId: user.id, isRoot: true, deletedAt: IsNull()},
        });
        if (existingRoot) {
          throw new Error(`Root account already exists for user ${user.id}`);
        }

        await manager.save(
          manager.create(AccountEntity, {
            userId: user.id,
            name: ROOT_ACCOUNT_NAME,
            type: AccountTypeEnum.CASH.toString(),
            initialBalance: 0,
            currentBalance: 0,
            includeInTotal: true,
            targetGoal: null,
            creditLimit: null,
            color: null,
            icon: null,
            pinToHome: true,
            isRoot: true,
            note: null,
            deletedAt: null,
          }),
        );

        await manager.save(
          manager.create(RefreshTokenEntity, {
            userId: user.id,
            tokenHash: input.refreshTokenHash,
            expiresAt: input.refreshExpiresAt,
            revokedAt: null,
          }),
        );

        // The canonical row is created with the user (US-902). Writing it last
        // keeps the existing insert order stable and rolls it back with the user.
        await manager.save(
          manager.create(UserPreferencesEntity, {
            userId: user.id,
            theme: DEFAULT_USER_DATA_EXPORT_PREFERENCES.theme,
            pwaBannerDismissedAt: DEFAULT_USER_DATA_EXPORT_PREFERENCES.pwaBannerDismissedAt,
            hideBalance: DEFAULT_USER_DATA_EXPORT_PREFERENCES.accounts.hideBalance,
            hideReversal: DEFAULT_USER_DATA_EXPORT_PREFERENCES.movements.hideReversal,
            deletedAt: null,
          }),
        );

        return user;
      });
    } catch (error) {
      if (isDuplicateEmailError(error)) {
        throw duplicateEmailException();
      }
      throw error;
    }
  }
}
