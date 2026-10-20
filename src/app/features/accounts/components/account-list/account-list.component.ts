import {ChangeDetectionStrategy, Component, input, output} from '@angular/core';
import {RouterLink} from '@angular/router';
import {ACCOUNT_TYPE_MAP} from '@core/constants';
import {Account} from '@core/models';
import {accountColor, formatCurrency, getCreditUsage, resolveAccountColor} from '@core/utils';
import {AppIconComponent} from '@shared/components/app-icon/app-icon.component';

@Component({
  selector: 'app-account-list',
  imports: [AppIconComponent, RouterLink],
  templateUrl: './account-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountListComponent {
  readonly accounts = input.required<Account[]>();

  readonly editAccount = output<Account>();

  readonly formatCurrency = formatCurrency;

  readonly creditUsage = getCreditUsage;

  readonly accountAccent = (account: Account): string =>
    accountColor(resolveAccountColor(account)).chip;

  readonly accountTypeName = (account: Account): string =>
    ACCOUNT_TYPE_MAP[account.type]?.name ?? '';

  getGoalProgress(account: Account): number {
    const goal = account.targetGoal ?? 0;
    if (goal <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round((account.currentBalance / goal) * 100)));
  }

  onEditAccount(account: Account): void {
    this.editAccount.emit(account);
  }
}
