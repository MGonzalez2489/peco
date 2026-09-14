import {ChangeDetectionStrategy, Component, computed, inject} from '@angular/core';
import {RouterLink} from '@angular/router';
import {Account} from '@core/models';
import {FINANCE_STORAGE} from '@core/services/finance-storage.interface';
import {formatCurrency} from '@core/utils';
import {MovementListComponent, StatCardComponent} from '@shared/components';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, MovementListComponent, StatCardComponent],
  templateUrl: './dashboard.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  readonly storage = inject(FINANCE_STORAGE);

  readonly accounts = this.storage.accounts;
  readonly totalBalance = this.storage.totalBalance;

  readonly pinnedAccounts = computed(() => this.accounts().filter((account) => account.pinToHome));

  readonly recentMovements = computed(() =>
    [...this.storage.movements()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
  );

  readonly accountSubtext = (account: Account): string =>
    account.targetGoal !== undefined
      ? `Meta ${formatCurrency(account.targetGoal)}`
      : 'Sin meta asignada';
}
