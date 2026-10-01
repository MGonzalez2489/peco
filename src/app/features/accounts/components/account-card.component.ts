import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';
import {RouterLink} from '@angular/router';
import {Account} from '@core/models';
import {AccountsStore} from '@core/stores/accounts.store';
import {formatCurrency} from '@core/utils';
import {StatCardComponent} from '@shared/components/stat-card/stat-card.component';

@Component({
  selector: 'app-account-card',
  imports: [RouterLink, StatCardComponent],
  templateUrl: './account-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountCardComponent {
  readonly account = input.required<Account>();

  readonly accountsStore = inject(AccountsStore);

  readonly pinned = computed(() => this.account().pinToHome ?? false);

  readonly subtext = computed(() => {
    const goal = this.account().targetGoal;
    return goal !== undefined ? `Meta ${formatCurrency(goal)}` : 'Sin meta asignada';
  });

  togglePin(): void {
    this.accountsStore.togglePin(this.account().id);
  }
}
