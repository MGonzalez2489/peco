import {ChangeDetectionStrategy, Component, computed, inject} from '@angular/core';
import {RouterLink} from '@angular/router';
import {Account} from '@core/models';
import {AccountsStore} from '@core/stores/accounts.store';
import {MovementsStore} from '@core/stores/movements.store';
import {formatCurrency} from '@core/utils';
import {MovementListComponent, StatCardComponent} from '@shared/components';
import {DragScrollDirective} from '@shared/directives/drag-scroll.directive';
import {UpcomingPaymentsWidgetComponent} from './components/upcoming-payments-widget.component';

@Component({
  selector: 'app-dashboard',
  imports: [
    RouterLink,
    DragScrollDirective,
    MovementListComponent,
    StatCardComponent,
    UpcomingPaymentsWidgetComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  readonly accountsStore = inject(AccountsStore);
  readonly movementsStore = inject(MovementsStore);

  readonly availableBalance = this.accountsStore.availableBalance;

  readonly pinnedAccounts = this.accountsStore.pinnedAccounts;

  readonly recentMovements = computed(() => this.movementsStore.recentMovements(5));

  readonly accountSubtext = (account: Account): string =>
    account.targetGoal !== undefined
      ? `Meta ${formatCurrency(account.targetGoal)}`
      : 'Sin meta asignada';
}
