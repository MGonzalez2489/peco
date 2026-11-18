import {HttpStatus} from '@nestjs/common';
import {DataSource} from 'typeorm';
import {ApiException} from '../../common/http/api-exception';
import {AccountEntity, RefreshTokenEntity, UserEntity} from '../../database/entities';
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
  let create: jest.Mock;
  let save: jest.Mock;
  let transaction: jest.Mock;
  let manager: {getRepository: jest.Mock; create: jest.Mock; save: jest.Mock};
  let repository: AuthRegistrationRepository;

  beforeEach(() => {
    findOne = jest.fn().mockResolvedValue(null);
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
    manager = {getRepository: jest.fn(() => ({findOne})), create, save};
    transaction = jest.fn(async (callback: (manager: unknown) => Promise<unknown>) =>
      callback(manager),
    );
    repository = new AuthRegistrationRepository({transaction} as unknown as DataSource);
  });

  it('writes the user, root account and refresh token inside one transaction', async () => {
    const user = await repository.create(INPUT);

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(findOne).toHaveBeenCalledWith({where: {email: 'user@example.com'}});
    expect(save).toHaveBeenCalledTimes(3);
    expect(save.mock.calls[0][0]).toBeInstanceOf(UserEntity);
    expect(save.mock.calls[1][0]).toBeInstanceOf(AccountEntity);
    expect(save.mock.calls[2][0]).toBeInstanceOf(RefreshTokenEntity);

    expect(save.mock.calls[1][0]).toMatchObject({
      userId: 7,
      name: 'Efectivo',
      type: 'CASH',
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
});
