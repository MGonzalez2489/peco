import {Injectable} from '@nestjs/common';
import type {PreferencesResponse, UpdatePreferencesRequest} from '@peco/contracts';
import type {UserEntity, UserPreferencesEntity} from '../../database/entities';
import {DEFAULT_USER_DATA_EXPORT_PREFERENCES} from '../../users/constants/default-user-data-export-preferences.constant';
import {UserProfileRepository} from '../../users/services/user-profile.repository';
import {mergeUserDataExportPreferences} from '../../users/utils/merge-user-data-export-preferences.util';
import {userNotFoundException} from '../../users/utils/user-not-found.exception';
import {normalizePreferencesPatch} from '../utils/normalize-preferences-patch.util';
import {PreferencesRepository} from './preferences.repository';

type PreferenceValues = Pick<
  UserPreferencesEntity,
  'theme' | 'pwaBannerDismissedAt' | 'hideBalance' | 'hideReversal'
>;

/** Resolves the active caller and merges partial writes without trusting their types. */
@Injectable()
export class PreferencesService {
  constructor(
    private readonly profile: UserProfileRepository,
    private readonly repository: PreferencesRepository,
  ) {}

  async find(publicId: string): Promise<PreferencesResponse> {
    const user = await this.resolveUser(publicId);

    return this.map(await this.repository.find(user.id));
  }

  async update(
    publicId: string,
    request: UpdatePreferencesRequest,
  ): Promise<PreferencesResponse> {
    const user = await this.resolveUser(publicId);
    const stored = await this.repository.find(user.id);
    const patch = normalizePreferencesPatch(request);
    const values: PreferenceValues = {
      theme: patch.theme ?? stored?.theme ?? DEFAULT_USER_DATA_EXPORT_PREFERENCES.theme,
      pwaBannerDismissedAt:
        patch.pwaBannerDismissedAt !== undefined
          ? patch.pwaBannerDismissedAt
          : (stored?.pwaBannerDismissedAt ??
            DEFAULT_USER_DATA_EXPORT_PREFERENCES.pwaBannerDismissedAt),
      hideBalance:
        patch.hideBalance ?? stored?.hideBalance ?? DEFAULT_USER_DATA_EXPORT_PREFERENCES.accounts.hideBalance,
      hideReversal:
        patch.hideReversal ??
        stored?.hideReversal ??
        DEFAULT_USER_DATA_EXPORT_PREFERENCES.movements.hideReversal,
    };

    if (Object.keys(patch).length === 0) {
      return this.map(stored);
    }
    if (!stored) {
      return this.map(await this.repository.save(user.id, null, values));
    }
    if (this.isUnchanged(stored, values)) {
      return this.map(stored);
    }

    return this.map(await this.repository.save(user.id, stored, values));
  }

  private async resolveUser(publicId: string): Promise<UserEntity> {
    const user = await this.profile.findActiveByPublicId(publicId);
    if (!user) {
      throw userNotFoundException();
    }

    return user;
  }

  private isUnchanged(current: UserPreferencesEntity, values: PreferenceValues): boolean {
    return (
      current.theme === values.theme &&
      current.pwaBannerDismissedAt === values.pwaBannerDismissedAt &&
      current.hideBalance === values.hideBalance &&
      current.hideReversal === values.hideReversal
    );
  }

  private map(value: UserPreferencesEntity | null): PreferencesResponse {
    return {
      ...mergeUserDataExportPreferences(value),
      updatedAt: value?.updatedAt ?? null,
    };
  }
}
