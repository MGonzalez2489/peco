import type {PreferencesResponse, UpdatePreferencesRequest} from '@peco/contracts';

type PreferencesPatch = Partial<Pick<PreferencesResponse, 'theme' | 'pwaBannerDismissedAt'>> & {
  hideBalance?: boolean;
  hideReversal?: boolean;
};

/** Drops undefined leaves so the merge keeps the stored value for wrong-typed input. */
export const normalizePreferencesPatch = (request: UpdatePreferencesRequest): PreferencesPatch => {
  const patch: PreferencesPatch = {};

  if (request.theme !== undefined) {
    patch.theme = request.theme;
  }
  if (request.pwaBannerDismissedAt !== undefined) {
    patch.pwaBannerDismissedAt = request.pwaBannerDismissedAt;
  }
  if (request.accounts?.hideBalance !== undefined) {
    patch.hideBalance = request.accounts.hideBalance;
  }
  if (request.movements?.hideReversal !== undefined) {
    patch.hideReversal = request.movements.hideReversal;
  }

  return patch;
};
