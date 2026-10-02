export interface BackupData {
  version: string;
  exportedAt: string;
  data: {
    accounts?: unknown[];
    transactions?: unknown[];
    scheduledTransactions?: unknown[];
    categories?: unknown[];
    theme?: string;
    [key: string]: unknown;
  };
}
