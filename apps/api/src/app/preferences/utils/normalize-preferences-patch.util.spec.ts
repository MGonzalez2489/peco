import type {UpdatePreferencesRequest} from '@peco/contracts';
import {AppThemeEnum} from '@peco/enums';
import {normalizePreferencesPatch} from './normalize-preferences-patch.util';

describe('normalizePreferencesPatch (US-901)', () => {
  it('keeps only the leaves that are present', () => {
    const request: UpdatePreferencesRequest = {
      theme: AppThemeEnum.DARK.toString(),
      pwaBannerDismissedAt: null,
      accounts: {hideBalance: true},
      movements: {hideReversal: false},
    };

    expect(normalizePreferencesPatch(request)).toEqual({
      theme: AppThemeEnum.DARK.toString(),
      pwaBannerDismissedAt: null,
      hideBalance: true,
      hideReversal: false,
    });
  });

  it('drops undefined leaves produced by wrong-typed DTO transforms', () => {
    const request = {
      theme: undefined,
      pwaBannerDismissedAt: undefined,
      accounts: {hideBalance: undefined},
      movements: undefined,
    } as UpdatePreferencesRequest;

    expect(normalizePreferencesPatch(request)).toEqual({});
  });
});
