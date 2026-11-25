import type {UpdatePreferencesRequest} from '@peco/contracts';
import {AppThemeEnum} from '@peco/enums';
import type {UserEntity, UserPreferencesEntity} from '../../database/entities';
import {UserProfileRepository} from '../../users/services/user-profile.repository';
import {PreferencesRepository} from './preferences.repository';
import {PreferencesService} from './preferences.service';

const USER_PUBLIC_ID = 'user-public-id';
const UPDATED_AT = '2026-11-25T10:00:00.000Z';
const DISMISSED_AT = '2026-11-20T09:30:00.000Z';
const LIGHT = AppThemeEnum.LIGHT.toString();
const DARK = AppThemeEnum.DARK.toString();
const SYSTEM = AppThemeEnum.SYSTEM.toString();

const user = {id: 7} as UserEntity;

const stored = {
  theme: SYSTEM,
  pwaBannerDismissedAt: DISMISSED_AT,
  hideBalance: false,
  hideReversal: false,
  updatedAt: '2026-11-21T10:00:00.000Z',
  deletedAt: null,
} as unknown as UserPreferencesEntity;

describe('PreferencesService (US-901)', () => {
  let profile: {findActiveByPublicId: jest.Mock};
  let repository: {find: jest.Mock; save: jest.Mock};
  let service: PreferencesService;

  beforeEach(() => {
    profile = {findActiveByPublicId: jest.fn().mockResolvedValue(user)};
    repository = {find: jest.fn().mockResolvedValue(stored), save: jest.fn()};
    service = new PreferencesService(
      profile as unknown as UserProfileRepository,
      repository as unknown as PreferencesRepository,
    );
  });

  it('maps the stored row for the active caller', async () => {
    const result = await service.find(USER_PUBLIC_ID);

    expect(profile.findActiveByPublicId).toHaveBeenCalledWith(USER_PUBLIC_ID);
    expect(repository.find).toHaveBeenCalledWith(7);
    expect(result).toEqual({
      theme: SYSTEM,
      pwaBannerDismissedAt: DISMISSED_AT,
      accounts: {hideBalance: false},
      movements: {hideReversal: false},
      updatedAt: stored.updatedAt,
    });
  });

  it('returns documented defaults with a null timestamp when the row is missing', async () => {
    repository.find.mockResolvedValue(null);

    await expect(service.find(USER_PUBLIC_ID)).resolves.toEqual({
      theme: LIGHT,
      pwaBannerDismissedAt: null,
      accounts: {hideBalance: false},
      movements: {hideReversal: true},
      updatedAt: null,
    });
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects an inactive caller before touching preferences', async () => {
    profile.findActiveByPublicId.mockResolvedValue(null);

    await expect(service.find(USER_PUBLIC_ID)).rejects.toMatchObject({code: 'NOT_FOUND'});
    expect(repository.find).not.toHaveBeenCalled();
  });

  it('deep-merges only the sent sections and keeps the caller as owner', async () => {
    repository.save.mockImplementation(
      async (_userId: number, _current: UserPreferencesEntity | null, values) => ({
        ...stored,
        ...values,
        updatedAt: UPDATED_AT,
      }),
    );

    const result = await service.update(USER_PUBLIC_ID, {
      theme: DARK,
      accounts: {hideBalance: true},
    });

    expect(repository.save).toHaveBeenCalledWith(7, stored, {
      theme: DARK,
      pwaBannerDismissedAt: DISMISSED_AT,
      hideBalance: true,
      hideReversal: false,
    });
    expect(result).toEqual({
      theme: DARK,
      pwaBannerDismissedAt: DISMISSED_AT,
      accounts: {hideBalance: true},
      movements: {hideReversal: false},
      updatedAt: UPDATED_AT,
    });
  });

  it('leaves the stored values untouched when every supplied leaf is invalid', async () => {
    const request = {
      theme: undefined,
      pwaBannerDismissedAt: undefined,
      accounts: {hideBalance: undefined},
      movements: undefined,
    } as UpdatePreferencesRequest;

    await expect(service.update(USER_PUBLIC_ID, request)).resolves.toEqual({
      theme: SYSTEM,
      pwaBannerDismissedAt: DISMISSED_AT,
      accounts: {hideBalance: false},
      movements: {hideReversal: false},
      updatedAt: stored.updatedAt,
    });
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('clears the PWA banner timestamp with an explicit null', async () => {
    repository.save.mockImplementation(
      async (_userId: number, _current: UserPreferencesEntity | null, values) => ({
        ...stored,
        ...values,
        updatedAt: UPDATED_AT,
      }),
    );

    await service.update(USER_PUBLIC_ID, {pwaBannerDismissedAt: null});

    expect(repository.save).toHaveBeenCalledWith(7, stored, {
      theme: SYSTEM,
      pwaBannerDismissedAt: null,
      hideBalance: false,
      hideReversal: false,
    });
  });

  it('creates a missing row from the defaults plus the valid patch', async () => {
    repository.find.mockResolvedValue(null);
    repository.save.mockImplementation(
      async (_userId: number, _current: UserPreferencesEntity | null, values) => ({
        ...stored,
        ...values,
        updatedAt: UPDATED_AT,
      }),
    );

    await service.update(USER_PUBLIC_ID, {movements: {hideReversal: false}});

    expect(repository.save).toHaveBeenCalledWith(7, null, {
      theme: LIGHT,
      pwaBannerDismissedAt: null,
      hideBalance: false,
      hideReversal: false,
    });
  });
});
