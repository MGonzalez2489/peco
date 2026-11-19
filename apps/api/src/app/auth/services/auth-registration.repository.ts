import {Injectable} from '@nestjs/common';
import {AccountTypeEnum} from '@peco/enums';
import {DataSource} from 'typeorm';
import {AccountEntity, RefreshTokenEntity, UserEntity} from '../../database/entities';
import {ROOT_ACCOUNT_NAME} from '../constants/root-account-name.constant';
import type {RegistrationInput} from '../types/registration-input.type';
import {duplicateEmailException} from '../utils/duplicate-email.exception';
import {isDuplicateEmailError} from '../utils/is-duplicate-email-error.util';

/**
 * Owns the single registration transaction: user, root account and refresh token
 * are written together, so a failed account insert leaves no user behind (D35).
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
