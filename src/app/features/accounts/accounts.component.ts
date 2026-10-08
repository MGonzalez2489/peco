import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {RouterLink} from '@angular/router';
import {Account} from '@core/models';
import {AccountsStore} from '@core/stores/accounts.store';
import {accountColor, formatCurrency} from '@core/utils';
import {MovementFormModalComponent} from '@features/movements/components';
import {AppIconComponent} from '@shared/components/app-icon/app-icon.component';
import {DragScrollDirective} from '@shared/directives/drag-scroll.directive';
import {AccountFormModalComponent} from './components/account-form-modal.component';

@Component({
  selector: 'app-accounts',
  imports: [
    RouterLink,
    AppIconComponent,
    DragScrollDirective,
    AccountFormModalComponent,
    MovementFormModalComponent,
  ],
  templateUrl: './accounts.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountsComponent {
  readonly accountsStore = inject(AccountsStore);

  readonly accounts = this.accountsStore.accounts;

  readonly totalBalance = this.accountsStore.totalBalance;

  readonly featuredAccounts = this.accountsStore.featuredAccounts;

  readonly secondaryAccounts = this.accountsStore.secondaryAccounts;

  readonly accountCount = computed(() => this.accounts().length);

  readonly createModalOpen = signal(false);

  readonly transferModalOpen = signal(false);

  readonly accountColor = accountColor;

  readonly formatCurrency = formatCurrency;

  openCreateModal(): void {
    this.createModalOpen.set(true);
  }

  openTransferModal(): void {
    this.transferModalOpen.set(true);
  }

  getGoalProgress(account: Account): number {
    const goal = account.targetGoal ?? 0;
    if (goal <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round((account.currentBalance / goal) * 100)));
  }

  featuredCardClass(account: Account): string {
    return account.isRoot
      ? 'border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-800 text-white'
      : 'border border-slate-200/80 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white';
  }
}
