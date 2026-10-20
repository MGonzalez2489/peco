import {Pipe, PipeTransform} from '@angular/core';
import {ACCOUNT_TYPE_MAP} from '@core/constants/account-type-map.constant';
import {AccountType} from '@core/types';

@Pipe({
  name: 'accountTypeColor',
  standalone: true,
})
export class AccountTypeColorPipe implements PipeTransform {
  transform(type: AccountType): string {
    return ACCOUNT_TYPE_MAP[type]?.color ?? 'indigo';
  }
}
