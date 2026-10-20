import {AppTheme} from '../types/app-theme.type';

export interface UserPreferences {
  theme: AppTheme;
  pwaBannerDismissedAt: string | null;
}
