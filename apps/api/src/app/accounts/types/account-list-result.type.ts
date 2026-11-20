import type {AccountResponseDto} from '../dto/account-response.dto';
import type {AccountSummaryDto} from '../dto/account-summary.dto';

/** Internal service result; the controller splits it into `data` and `meta` (D65). */
export interface AccountListResult {
  items: AccountResponseDto[];
  summary: AccountSummaryDto;
}
