import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';
import {RouterLink} from '@angular/router';
import {Account} from '@core/models';
import {FINANCE_STORAGE} from '@core/services/finance-storage.interface';
import {formatCurrency} from '@core/utils';
import {StatCardComponent} from '@shared/components/stat-card/stat-card.component';

@Component({
  selector: 'app-account-card',
  imports: [RouterLink, StatCardComponent],
  templateUrl: './account-card.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountCardComponent {
  readonly account = input.required<Account>();

  readonly storage = inject(FINANCE_STORAGE);

  readonly pinned = computed(() => this.account().pinToHome ?? false);

  readonly subtext = computed(() => {
    const goal = this.account().targetGoal;
    return goal !== undefined ? `Meta ${formatCurrency(goal)}` : 'Sin meta asignada';
  });

  togglePin(): void {
    const account = this.account();
    this.storage.updateAccount(account.id, {
      name: account.name,
      initialBalance: account.currentBalance,
      targetGoal: account.targetGoal,
      color: account.color,
      icon: account.icon,
      pinToHome: !this.pinned(),
    });
  }
}
