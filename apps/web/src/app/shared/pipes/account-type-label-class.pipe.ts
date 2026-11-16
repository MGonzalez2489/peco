import {Pipe, PipeTransform} from '@angular/core';
import {ACCOUNT_TYPE_PALETTE} from '@core/constants/account-type-palette.constant';
import {AccountType} from '@core/types';

/**
 * Resolves the Tailwind tone used to label an account type, keeping the
 * account type colors consistent across the responsive summaries.
 */
@Pipe({
  name: 'accountTypeLabelClass',
  standalone: true,
})
export class AccountTypeLabelClassPipe implements PipeTransform {
  transform(type: AccountType): string {
    return ACCOUNT_TYPE_PALETTE[type]?.label ?? ACCOUNT_TYPE_PALETTE.CASH.label;
  }
}
