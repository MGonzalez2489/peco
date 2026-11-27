import {IconName} from '@shared/components/app-icon/app-icon.component';
import {ScheduledTransactionTypeKey} from '../types/scheduled-transaction-type-key.type';

export interface ScheduledTransactionType {
  key: ScheduledTransactionTypeKey;
  name: string;
  color: string;
  icon: IconName;
}
