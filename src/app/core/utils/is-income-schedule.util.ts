import {ScheduledTransactionType} from '../types/scheduled-transaction-type.type';

export const isIncomeSchedule = (type: ScheduledTransactionType): boolean => type === 'INCOME';
