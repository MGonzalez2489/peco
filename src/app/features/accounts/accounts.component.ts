import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {AccountsStore} from '@core/stores/accounts.store';
import {formatCurrency} from '@core/utils';
import {AccountCardComponent} from './components/account-card.component';
import {AccountFormModalComponent} from './components/account-form-modal.component';
import {AppIconComponent} from '@shared/components/app-icon/app-icon.component';

@Component({
  selector: 'app-accounts',
  imports: [AccountCardComponent, AccountFormModalComponent, AppIconComponent],
  templateUrl: './accounts.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountsComponent {
  readonly accountsStore = inject(AccountsStore);

  readonly accounts = this.accountsStore.accounts;

  readonly totalBalance = this.accountsStore.totalBalance;

  readonly availableBalance = this.accountsStore.availableBalance;

  readonly accountCount = computed(() => this.accounts().length);

  readonly formatCurrency = formatCurrency;

  readonly modalOpen = signal(false);
}
