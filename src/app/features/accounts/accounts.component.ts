import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {Account} from '@core/models';
import {AccountsStore} from '@core/stores/accounts.store';
import {accountColor, formatCurrency} from '@core/utils';
import {MovementFormModalComponent} from '@features/movements/components';
import {AppIconComponent} from '@shared/components/app-icon/app-icon.component';
import {AccountDistributionChartComponent} from './components/account-distribution-chart/account-distribution-chart.component';
import {AccountFormModalComponent} from './components/account-form-modal.component';
import {RouterLink} from '@angular/router';

@Component({
  selector: 'app-accounts',
  imports: [
    AppIconComponent,
    AccountFormModalComponent,
    AccountDistributionChartComponent,
    MovementFormModalComponent,
    RouterLink,
  ],
  templateUrl: './accounts.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountsComponent {
  readonly accountsStore = inject(AccountsStore);

  readonly accounts = this.accountsStore.accounts;

  readonly totalBalance = this.accountsStore.totalBalance;

  readonly accountCount = computed(() => this.accounts().length);

  readonly createModalOpen = signal(false);

  readonly transferModalOpen = signal(false);

  readonly editingAccount = signal<Account | null>(null);

  readonly accountColor = accountColor;

  readonly formatCurrency = formatCurrency;

  openCreateModal(): void {
    this.createModalOpen.set(true);
  }

  openTransferModal(): void {
    this.transferModalOpen.set(true);
  }

  openEditModal(account: Account): void {
    this.editingAccount.set(account);
  }

  closeEditModal(): void {
    this.editingAccount.set(null);
  }

  getGoalProgress(account: Account): number {
    const goal = account.targetGoal ?? 0;
    if (goal <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round((account.currentBalance / goal) * 100)));
  }
}
