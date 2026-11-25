import {HttpStatus} from '@nestjs/common';
import {AccountTypeEnum, AppThemeEnum} from '@peco/enums';
import {DataSource} from 'typeorm';
import {ApiException} from '../../common/http/api-exception';
import {
  AccountEntity,
  RefreshTokenEntity,
  UserEntity,
  UserPreferencesEntity,
} from '../../database/entities';
import {AuthRegistrationRepository} from './auth-registration.repository';

const INPUT = {
  email: 'user@example.com',
  passwordHash: 'argon2-hash',
  name: 'Manuel',
  refreshTokenHash: 'refresh-hash',
  refreshExpiresAt: '2026-11-18T12:30:00.000Z',
};

describe('AuthRegistrationRepository', () => {
  let findOne: jest.Mock;
  let findRoot: jest.Mock;
  let create: jest.Mock;
  let save: jest.Mock;
  let transaction: jest.Mock;
  let manager: {getRepository: jest.Mock; findOne: jest.Mock; create: jest.Mock; save: jest.Mock};
  let repository: AuthRegistrationRepository;

  beforeEach(() => {
    findOne = jest.fn().mockResolvedValue(null);
    findRoot = jest.fn().mockResolvedValue(null);
    create = jest.fn((entity: new () => object, values: object) =>
      Object.assign(new entity(), values),
    );
    save = jest.fn(async (entity: object) => {
      if (entity instanceof UserEntity) {
        Object.assign(entity, {
          id: 7,
          publicId: 'user-public-id',
          createdAt: '2026-11-18T12:00:00.000Z',
          updatedAt: '2026-11-18T12:00:00.000Z',
        });
      }
      return entity;
    });
    manager = {getRepository: jest.fn(() => ({findOne})), findOne: findRoot, create, save};
    transaction = jest.fn(async (callback: (manager: unknown) => Promise<unknown>) =>
      callback(manager),
    );
    repository = new AuthRegistrationRepository({transaction} as unknown as DataSource);
  });

  it('writes the user, root account, refresh token and preferences in one transaction', async () => {
    const user = await repository.create(INPUT);

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(findOne).toHaveBeenCalledWith({where: {email: 'user@example.com'}});
    expect(save).toHaveBeenCalledTimes(4);
    expect(save.mock.calls[0][0]).toBeInstanceOf(UserEntity);
    expect(save.mock.calls[1][0]).toBeInstanceOf(AccountEntity);
    expect(save.mock.calls[2][0]).toBeInstanceOf(RefreshTokenEntity);
    expect(save.mock.calls[3][0]).toBeInstanceOf(UserPreferencesEntity);

    expect(save.mock.calls[1][0]).toMatchObject({
      userId: 7,
      name: 'Efectivo',
      type: AccountTypeEnum.CASH.toString(),
      initialBalance: 0,
      currentBalance: 0,
      includeInTotal: true,
      pinToHome: true,
      isRoot: true,
    });
    expect(save.mock.calls[2][0]).toMatchObject({
      userId: 7,
      tokenHash: 'refresh-hash',
      expiresAt: INPUT.refreshExpiresAt,
      revokedAt: null,
    });
    expect(save.mock.calls[3][0]).toMatchObject({
      userId: 7,
      theme: AppThemeEnum.LIGHT.toString(),
      pwaBannerDismissedAt: null,
      hideBalance: false,
      hideReversal: true,
      deletedAt: null,
    });
    expect(user.publicId).toBe('user-public-id');
  });

  it('rejects a reserved email before writing anything', async () => {
    findOne.mockResolvedValue({id: 1, email: INPUT.email});

    await expect(repository.create(INPUT)).rejects.toMatchObject({
      code: 'EMAIL_ALREADY_REGISTERED',
      status: HttpStatus.CONFLICT,
    });
    expect(save).not.toHaveBeenCalled();
  });

  it('maps a unique-key race to the duplicate-email error', async () => {
    save.mockRejectedValueOnce({code: 'ER_DUP_ENTRY'});

    const failure = await repository.create(INPUT).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ApiException);
    expect(failure).toMatchObject({code: 'EMAIL_ALREADY_REGISTERED'});
  });

  it('aborts the write sequence when the root account insert fails', async () => {
    save.mockImplementation(async (entity: object) => {
      if (entity instanceof AccountEntity) {
        throw new Error('account insert failed');
      }
      if (entity instanceof UserEntity) {
        Object.assign(entity, {id: 7, publicId: 'user-public-id'});
      }
      return entity;
    });

    await expect(repository.create(INPUT)).rejects.toThrow('account insert failed');
    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[1][0]).toBeInstanceOf(AccountEntity);
  });

  it('aborts the transaction when an active root already exists for the user', async () => {
    findRoot.mockResolvedValue({id: 99, isRoot: true});

    await expect(repository.create(INPUT)).rejects.toThrow(
      'Root account already exists for user 7',
    );

    expect(findRoot).toHaveBeenCalledWith(AccountEntity, {
      where: {userId: 7, isRoot: true, deletedAt: expect.anything()},
    });
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][0]).toBeInstanceOf(UserEntity);
  });
});
