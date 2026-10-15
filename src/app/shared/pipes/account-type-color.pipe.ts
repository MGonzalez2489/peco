import {Pipe, PipeTransform} from '@angular/core';
import {AccountType} from '@core/models';

@Pipe({
  name: 'accountTypeColor',
  standalone: true,
})
export class AccountTypeColorPipe implements PipeTransform {
  transform(type: AccountType): string {
    return type?.color ?? 'indigo';
  }
}
