import type {PasswordHasher} from '../auth/services/password-hasher';
import type {UserEntity} from '../database/entities';
import {UserDeletionRepository} from './services/user-deletion.repository';
import {UserPasswordRepository} from './services/user-password.repository';
import {UserProfileRepository} from './services/user-profile.repository';
import {UsersService} from './users.service';

const ACTIVE_USER = {
  id: 7,
  publicId: 'user-public-id',
  email: 'user@example.com',
  name: 'Manuel',
  passwordHash: 'argon2-hash',
  createdAt: '2026-11-19T12:00:00.000Z',
  updatedAt: '2026-11-19T12:00:00.000Z',
} as UserEntity;

describe('UsersService (US-207/US-208)', () => {
  let service: UsersService;
  let profile: {findActiveByPublicId: jest.Mock; updateName: jest.Mock};
  let deletion: {delete: jest.Mock};
  let passwords: {change: jest.Mock};
  let passwordHasher: {verify: jest.Mock; hash: jest.Mock};

  beforeEach(() => {
    profile = {
      findActiveByPublicId: jest.fn().mockResolvedValue(ACTIVE_USER),
      updateName: jest.fn().mockResolvedValue({...ACTIVE_USER, name: 'Ana'}),
    };
    deletion = {delete: jest.fn().mockResolvedValue(true)};
    passwords = {change: jest.fn().mockResolvedValue(true)};
    passwordHasher = {
      verify: jest.fn().mockResolvedValue(true),
      hash: jest.fn().mockResolvedValue('new-argon2-hash'),
    };

    service = new UsersService(
      profile as unknown as UserProfileRepository,
      deletion as unknown as UserDeletionRepository,
      passwords as unknown as UserPasswordRepository,
      passwordHasher as unknown as PasswordHasher,
    );
  });

  it('returns the current profile without writing when no name is supplied', async () => {
    const result = await service.update('user-public-id', {});

    expect(result).toEqual({
      publicId: ACTIVE_USER.publicId,
      email: ACTIVE_USER.email,
      name: ACTIVE_USER.name,
      createdAt: ACTIVE_USER.createdAt,
      updatedAt: ACTIVE_USER.updatedAt,
    });
    expect(profile.findActiveByPublicId).toHaveBeenCalledWith('user-public-id');
    expect(profile.updateName).not.toHaveBeenCalled();
  });

  it('updates only the name and returns the public response', async () => {
    const result = await service.update('user-public-id', {name: 'Ana'});

    expect(profile.updateName).toHaveBeenCalledWith('user-public-id', 'Ana');
    expect(result.name).toBe('Ana');
    expect(result.email).toBe(ACTIVE_USER.email);
  });

  it('returns 404 when the profile to update no longer exists', async () => {
    profile.updateName.mockResolvedValue(null);

    await expect(service.update('user-public-id', {name: 'Ana'})).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
  });

  it('returns 404 without hashing when the password-change principal is absent', async () => {
    profile.findActiveByPublicId.mockResolvedValue(null);

    await expect(
      service.changePassword('user-public-id', {
        currentPassword: 'correct horse battery',
        newPassword: 'a new correct horse',
      }),
    ).rejects.toMatchObject({status: 404, code: 'NOT_FOUND'});
    expect(passwordHasher.verify).not.toHaveBeenCalled();
    expect(passwordHasher.hash).not.toHaveBeenCalled();
    expect(passwords.change).not.toHaveBeenCalled();
  });

  it('returns 401 UNAUTHORIZED and changes nothing for a wrong current password', async () => {
    passwordHasher.verify.mockResolvedValue(false);

    await expect(
      service.changePassword('user-public-id', {
        currentPassword: 'wrong-password',
        newPassword: 'a new correct horse',
      }),
    ).rejects.toMatchObject({status: 401, code: 'UNAUTHORIZED'});
    expect(passwordHasher.verify).toHaveBeenCalledWith('argon2-hash', 'wrong-password');
    expect(passwordHasher.hash).not.toHaveBeenCalled();
    expect(passwords.change).not.toHaveBeenCalled();
  });

  it('hashes the new password and revokes every session through the repository', async () => {
    await service.changePassword('user-public-id', {
      currentPassword: 'correct horse battery',
      newPassword: 'a new correct horse',
    });

    expect(passwordHasher.hash).toHaveBeenCalledWith('a new correct horse');
    expect(passwords.change).toHaveBeenCalledWith('user-public-id', 'new-argon2-hash');
  });

  it('returns 404 when the account disappears before the password change commits', async () => {
    passwords.change.mockResolvedValue(false);

    await expect(
      service.changePassword('user-public-id', {
        currentPassword: 'correct horse battery',
        newPassword: 'a new correct horse',
      }),
    ).rejects.toMatchObject({status: 404, code: 'NOT_FOUND'});
  });

  it('returns 404 without hashing when the profile to delete is absent', async () => {
    profile.findActiveByPublicId.mockResolvedValue(null);

    await expect(
      service.remove('user-public-id', {password: 'correct horse battery'}),
    ).rejects.toMatchObject({status: 404, code: 'NOT_FOUND'});
    expect(passwordHasher.verify).not.toHaveBeenCalled();
    expect(deletion.delete).not.toHaveBeenCalled();
  });

  it('returns 401 and leaves the account untouched for a wrong password', async () => {
    passwordHasher.verify.mockResolvedValue(false);

    await expect(
      service.remove('user-public-id', {password: 'wrong-password'}),
    ).rejects.toMatchObject({status: 401, code: 'INVALID_CREDENTIALS'});
    expect(passwordHasher.verify).toHaveBeenCalledWith('argon2-hash', 'wrong-password');
    expect(deletion.delete).not.toHaveBeenCalled();
  });

  it('deletes the account after the password was verified', async () => {
    await service.remove('user-public-id', {password: 'correct horse battery'});

    expect(deletion.delete).toHaveBeenCalledWith('user-public-id');
  });

  it('returns 404 when the account disappears before the deletion commits', async () => {
    deletion.delete.mockResolvedValue(false);

    await expect(
      service.remove('user-public-id', {password: 'correct horse battery'}),
    ).rejects.toMatchObject({status: 404, code: 'NOT_FOUND'});
  });
});
