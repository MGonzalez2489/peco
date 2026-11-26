import {JobKeyEnum} from '@peco/enums';

/** Connection-scoped advisory lock kept alongside the durable jobLocks row (D122/US-1001). */
export const RECONCILIATION_LOCK_NAME = `peco:${JobKeyEnum.RECONCILIATION.toString()
  .toLowerCase()
  .replaceAll('_', '-')}`;
