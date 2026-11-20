import type {AccountType} from '@peco/contracts';
import {AccountTypeEnum} from '@peco/enums';

/** Credit accounts are the only liabilities (5.3, D62). */
export const isLiabilityAccount = (type: AccountType): boolean =>
  type === AccountTypeEnum.CREDIT.toString();
