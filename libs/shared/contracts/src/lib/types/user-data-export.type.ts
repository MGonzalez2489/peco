import type {AccountType} from './account-type.type';
import type {AppTheme} from './app-theme.type';
import type {CategoryApplyType} from './category-apply-type.type';
import type {MovementType} from './movement-type.type';
import type {RecurrenceFrequency} from './recurrence-frequency.type';
import type {ScheduledExecutionStatus} from './scheduled-execution-status.type';
import type {ScheduledTransactionType} from './scheduled-transaction-type.type';

interface ExportedUser {
  publicId: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface ExportedPreferences {
  theme: AppTheme;
  pwaBannerDismissedAt: string | null;
  accounts: {hideBalance: boolean};
  movements: {hideReversal: boolean};
  updatedAt?: string;
}

interface ExportedAccount {
  publicId: string;
  name: string;
  type: AccountType;
  initialBalance: number;
  currentBalance: number;
  includeInTotal: boolean;
  targetGoal: number | null;
  creditLimit: number | null;
  color: string | null;
  icon: string | null;
  pinToHome: boolean;
  isRoot: boolean;
  note: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface ExportedCategory {
  publicId: string;
  name: string;
  displayName: string;
  icon: string | null;
  color: string | null;
  applyType: CategoryApplyType;
  isRoot: boolean;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface ExportedMovement {
  publicId: string;
  type: MovementType;
  amount: number;
  date: string;
  note: string | null;
  accountPublicId: string;
  targetAccountPublicId: string | null;
  categoryPublicId: string;
  reversalOfPublicId: string | null;
  replacesPublicId: string | null;
  isReversal: boolean;
  isReversed: boolean;
  isCanceled: boolean;
  scheduledTransactionPublicId: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface ExportedScheduledTransaction {
  publicId: string;
  name: string;
  estimatedAmount: number;
  type: ScheduledTransactionType;
  categoryPublicId: string;
  sourceAccountPublicId: string;
  destinationAccountPublicId: string | null;
  frequency: RecurrenceFrequency;
  interval: number;
  anchorDate: string;
  nextContemplatedDate: string;
  nextExecutionDate: string;
  autoApply: boolean;
  active: boolean;
  totalOccurrences: number | null;
  completedOccurrences: number;
  endDate: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface ExportedScheduledExecution {
  publicId: string;
  scheduledTransactionPublicId: string;
  contemplatedDate: string;
  occurrenceDate: string | null;
  movementPublicId: string | null;
  status: ScheduledExecutionStatus;
  reason: string | null;
  attempts: number;
  createdAt: string;
}

interface ExportedAccountPeriodBalance {
  accountPublicId: string;
  accountName: string;
  accountType: AccountType;
  color: string | null;
  icon: string | null;
  includeInTotal: boolean;
  initialBalance: number;
  finalBalance: number;
  totalTransactions: number;
  totalInflows: number;
  totalOutflows: number;
  totalTransfers: number;
}

interface ExportedPeriodSnapshot {
  publicId: string;
  period: string;
  startDate: string;
  endDate: string;
  globalInitialBalance: number;
  globalFinalBalance: number;
  totalInflows: number;
  totalOutflows: number;
  totalTransfers: number;
  totalTransactionsCount: number;
  closedAt: string;
  accountBalances: ExportedAccountPeriodBalance[];
}

/** Self-describing, read-only export of every row owned by one user (D73). */
export interface UserDataExport {
  exportedAt: string;
  schemaVersion: 1;
  user: ExportedUser;
  preferences: ExportedPreferences;
  accounts: ExportedAccount[];
  categories: ExportedCategory[];
  movements: ExportedMovement[];
  scheduledTransactions: ExportedScheduledTransaction[];
  scheduledExecutions: ExportedScheduledExecution[];
  periodSnapshots: ExportedPeriodSnapshot[];
}
