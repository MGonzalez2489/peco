import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {RouterLink} from '@angular/router';
import {Account, Movement} from '@core/models';
import {AccountsStore} from '@core/stores/accounts.store';
import {MovementsStore} from '@core/stores/movements.store';
import {UserPreferencesStore} from '@core/stores/user-preferences.store';
import {formatCurrency, getCreditUsage} from '@core/utils';
import {AccountTypeColorPipe} from '@shared/pipes/account-type-color.pipe';
import {MovementListComponent, StatCardComponent} from '@shared/components';
import {MovementDetailModalComponent} from '@features/movements/components/movement-detail-modal/movement-detail-modal.component';
import {DragScrollDirective} from '@shared/directives/drag-scroll.directive';
import {UpcomingPaymentsWidgetComponent} from './components/upcoming-payments-widget.component';

@Component({
  selector: 'app-dashboard',
  imports: [
    RouterLink,
    DragScrollDirective,
    MovementListComponent,
    MovementDetailModalComponent,
    StatCardComponent,
    UpcomingPaymentsWidgetComponent,
    AccountTypeColorPipe,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  readonly accountsStore = inject(AccountsStore);
  readonly movementsStore = inject(MovementsStore);
  private readonly userPreferencesStore = inject(UserPreferencesStore);

  readonly availableBalance = this.accountsStore.availableBalance;

  readonly pinnedAccounts = this.accountsStore.pinnedAccounts;

  readonly selectedMovement = signal<Movement | null>(null);

  readonly isMovementDetailOpen = computed(() => this.selectedMovement() !== null);

  readonly recentMovements = computed(() => this.movementsStore.recentMovements(5));

  readonly accountSubtext = (account: Account): string => {
    const format = (value: number): string =>
      this.userPreferencesStore.hideBalance() ? '--.--' : formatCurrency(value);

    const credit = getCreditUsage(account);
    if (credit) {
      return `De ${format(credit.limit)} te queda ${format(credit.available)}`;
    }
    return account.targetGoal !== undefined
      ? `Meta ${format(account.targetGoal)}`
      : 'Sin meta asignada';
  };

  openMovementDetail(movement: Movement): void {
    this.selectedMovement.set(movement);
  }

  closeMovementDetail(): void {
    this.selectedMovement.set(null);
  }
}
