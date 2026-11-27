import {ScheduledTransactionTypeEnum} from '@peco/enums';
import type {ScheduledTransactionTypeKey} from '../types/scheduled-transaction-type-key.type';

export const isIncomeSchedule = (type: ScheduledTransactionTypeKey): boolean =>
  type === ScheduledTransactionTypeEnum.INCOME.toString();
