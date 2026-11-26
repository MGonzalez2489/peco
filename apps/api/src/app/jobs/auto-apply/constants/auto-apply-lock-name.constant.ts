import {JobKeyEnum} from '@peco/enums';

/** Connection-scoped advisory lock kept alongside the durable jobLocks row (D109/US-1001). */
export const AUTO_APPLY_LOCK_NAME = `peco:${JobKeyEnum.AUTO_APPLY.toString()
  .toLowerCase()
  .replaceAll('_', '-')}`;
