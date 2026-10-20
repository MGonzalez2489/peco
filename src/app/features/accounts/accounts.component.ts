import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {Account} from '@core/models';
import {AccountsStore} from '@core/stores/accounts.store';
import {MovementFormModalComponent} from '@features/movements/components';
import {AppIconComponent} from '@shared/components/app-icon/app-icon.component';
import {AccountFormModalComponent} from './components/account-form-modal.component';
import {AccountListComponent} from './components/account-list/account-list.component';
import {AccountTypeDistributionComponent} from './components/account-type-distribution/account-type-distribution.component';

@Component({
  selector: 'app-accounts',
  imports: [
    AppIconComponent,
    AccountFormModalComponent,
    AccountListComponent,
    AccountTypeDistributionComponent,
    MovementFormModalComponent,
  ],
  templateUrl: './accounts.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountsComponent {
  readonly accountsStore = inject(AccountsStore);

  readonly accounts = this.accountsStore.accounts;

  readonly accountTypeSummaries = this.accountsStore.accountTypeSummaries;

  readonly createModalOpen = signal(false);

  readonly transferModalOpen = signal(false);

  readonly editingAccount = signal<Account | null>(null);

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
}
