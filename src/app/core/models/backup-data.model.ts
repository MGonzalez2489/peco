import {UserPreferences} from './user-preferences.model';

export interface BackupData {
  version: string;
  exportedAt: string;
  data: {
    accounts?: unknown[];
    transactions?: unknown[];
    scheduledTransactions?: unknown[];
    categories?: unknown[];
    preferences?: UserPreferences;
    theme?: string;
    [key: string]: unknown;
  };
}
