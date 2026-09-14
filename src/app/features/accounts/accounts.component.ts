import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {FINANCE_STORAGE} from '@core/services/finance-storage.interface';
import {AccountCardComponent} from './components/account-card.component';
import {AccountFormModalComponent} from './components/account-form-modal.component';

@Component({
  selector: 'app-accounts',
  imports: [AccountCardComponent, AccountFormModalComponent],
  templateUrl: './accounts.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountsComponent {
  readonly storage = inject(FINANCE_STORAGE);

  readonly accounts = this.storage.accounts;

  readonly modalOpen = signal(false);
}
