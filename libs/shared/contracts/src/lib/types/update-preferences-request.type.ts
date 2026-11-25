import type {AppTheme} from './app-theme.type';

/** Partial preferences payload; only the fields that are present are merged. */
export interface UpdatePreferencesRequest {
  theme?: AppTheme;
  pwaBannerDismissedAt?: string | null;
  accounts?: {hideBalance?: boolean};
  movements?: {hideReversal?: boolean};
}
