import {AppThemeEnum} from '@peco/enums';
import type {UserPreferencesEntity} from '../../database/entities';
import {mergeUserDataExportPreferences} from './merge-user-data-export-preferences.util';

const DEFAULTS = {
  theme: AppThemeEnum.LIGHT.toString(),
  pwaBannerDismissedAt: null,
  accounts: {hideBalance: false},
  movements: {hideReversal: true},
};

describe('mergeUserDataExportPreferences (US-902)', () => {
  it('returns canonical defaults when the row is missing', () => {
    expect(mergeUserDataExportPreferences(null)).toEqual(DEFAULTS);
  });

  it('overrides only the defaults that the stored row knows', () => {
    const stored = {
      theme: AppThemeEnum.SYSTEM.toString(),
      pwaBannerDismissedAt: '2026-11-20T09:30:00.000Z',
      hideBalance: true,
      hideReversal: false,
    } as unknown as UserPreferencesEntity;

    expect(mergeUserDataExportPreferences(stored)).toEqual({
      theme: AppThemeEnum.SYSTEM.toString(),
      pwaBannerDismissedAt: '2026-11-20T09:30:00.000Z',
      accounts: {hideBalance: true},
      movements: {hideReversal: false},
    });
  });

  it('ignores unknown stored fields and fills missing known fields from defaults', () => {
    const legacyRow = {
      theme: AppThemeEnum.DARK.toString(),
      pwaBannerDismissedAt: null,
      hideBalance: true,
      futurePreference: 'not-on-the-wire',
    } as unknown as UserPreferencesEntity;

    expect(mergeUserDataExportPreferences(legacyRow)).toEqual({
      theme: AppThemeEnum.DARK.toString(),
      pwaBannerDismissedAt: null,
      accounts: {hideBalance: true},
      movements: {hideReversal: true},
    });
  });
});
