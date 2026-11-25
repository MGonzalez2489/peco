import type {AppTheme} from './app-theme.type';

/** Per-user preferences in the nested wire shape documented in 8.14. */
export interface PreferencesResponse {
  theme: AppTheme;
  pwaBannerDismissedAt: string | null;
  accounts: {hideBalance: boolean};
  movements: {hideReversal: boolean};
  updatedAt: string | null;
}
