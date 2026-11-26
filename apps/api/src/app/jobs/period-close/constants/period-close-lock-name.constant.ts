import {JobKeyEnum} from '@peco/enums';

/** Connection-scoped advisory lock asserted by the period-close integration spec (D117/US-1001). */
export const PERIOD_CLOSE_LOCK_NAME = `peco:${JobKeyEnum.PERIOD_CLOSE.toString()
  .toLowerCase()
  .replaceAll('_', '-')}`;
