import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {AccountsStore} from '@core/stores/accounts.store';
import {AccountCardComponent} from './components/account-card.component';
import {AccountFormModalComponent} from './components/account-form-modal.component';

@Component({
  selector: 'app-accounts',
  imports: [AccountCardComponent, AccountFormModalComponent],
  templateUrl: './accounts.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountsComponent {
  readonly accountsStore = inject(AccountsStore);

  readonly accounts = this.accountsStore.accounts;

  readonly modalOpen = signal(false);
}
