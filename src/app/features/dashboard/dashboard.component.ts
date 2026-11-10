import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {RouterLink} from '@angular/router';
import {Account, Movement} from '@core/models';
import {AccountsStore} from '@core/stores/accounts.store';
import {GlobalPeriodStore} from '@core/stores/global-period.store';
import {MovementsStore} from '@core/stores/movements.store';
import {PeriodSnapshotsStore} from '@core/stores/period-snapshots.store';
import {UserPreferencesStore} from '@core/stores/user-preferences.store';
import {
  calculateMovementTotals,
  formatCentsToCurrency,
  getCreditUsage,
  toPeriod,
} from '@core/utils';
import {AccountTypeColorPipe} from '@shared/pipes/account-type-color.pipe';
import {AppIconComponent, MovementListComponent, StatCardComponent} from '@shared/components';
import {MovementDetailModalComponent} from '@features/movements/components/movement-detail-modal/movement-detail-modal.component';
import {MovementFormModalComponent} from '@features/movements/components/movement-form-modal.component';
import {DragScrollDirective} from '@shared/directives/drag-scroll.directive';
import {PeriodFlowChartComponent} from './components/period-flow-chart/period-flow-chart.component';
import {UpcomingPaymentsWidgetComponent} from './components/upcoming-payments-widget.component';

@Component({
  selector: 'app-dashboard',
  imports: [
    RouterLink,
    DragScrollDirective,
    MovementListComponent,
    MovementDetailModalComponent,
    MovementFormModalComponent,
    StatCardComponent,
    PeriodFlowChartComponent,
    UpcomingPaymentsWidgetComponent,
    AccountTypeColorPipe,
    AppIconComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  readonly accountsStore = inject(AccountsStore);
  readonly movementsStore = inject(MovementsStore);
  private readonly userPreferencesStore = inject(UserPreferencesStore);
  private readonly globalPeriodStore = inject(GlobalPeriodStore);
  private readonly snapshotsStore = inject(PeriodSnapshotsStore);

  readonly selectedPeriodKey = this.globalPeriodStore.selectedPeriodKey;
  readonly formattedPeriodLabel = this.globalPeriodStore.formattedPeriodLabel;
  readonly formattedPeriodLabelCompact = this.globalPeriodStore.formattedPeriodLabelCompact;
  readonly isPastPeriod = this.globalPeriodStore.isPastPeriod;
  readonly isCurrentPeriod = this.globalPeriodStore.isCurrentPeriod;
  readonly isFuturePeriod = this.globalPeriodStore.isFuturePeriod;

  readonly activeSnapshot = computed(() =>
    this.snapshotsStore.snapshotFor()(this.selectedPeriodKey()),
  );

  readonly periodMovements = computed(() =>
    this.movementsStore
      .visibleMovements()
      .filter((movement) => toPeriod(movement.date) === this.selectedPeriodKey()),
  );

  readonly periodTotals = computed(() => calculateMovementTotals(this.periodMovements()));

  readonly periodInflows = computed(() =>
    this.isPastPeriod() && this.activeSnapshot()
      ? (this.activeSnapshot()?.totalInflows ?? 0)
      : this.periodTotals().totalIncome,
  );

  readonly periodOutflows = computed(() =>
    this.isPastPeriod() && this.activeSnapshot()
      ? (this.activeSnapshot()?.totalOutflows ?? 0)
      : this.periodTotals().totalExpenses,
  );

  readonly periodTransactionsCount = computed(() =>
    this.isPastPeriod() && this.activeSnapshot()
      ? (this.activeSnapshot()?.totalTransactionsCount ?? 0)
      : this.periodMovements().length,
  );

  readonly periodNetBalance = computed(() => this.periodInflows() - this.periodOutflows());

  readonly periodTotalsSubtext = computed(() => {
    const format = (value: number): string =>
      this.userPreferencesStore.hideBalance() ? '--.--' : formatCentsToCurrency(value);

    return `Ingresos ${format(this.periodInflows())} · Egresos ${format(this.periodOutflows())}`;
  });

  readonly availableAmount = computed(() =>
    this.isPastPeriod() && this.activeSnapshot()
      ? (this.activeSnapshot()?.globalFinalBalance ?? 0)
      : this.accountsStore.availableBalance(),
  );

  readonly availableSubtext = computed(() => {
    if (this.isPastPeriod()) return 'Saldo congelado al cierre del período';
    if (this.isFuturePeriod()) return 'Saldo actual; el período aún no tiene movimientos';
    return 'Suma de tus apartados incluidos en el disponible';
  });

  readonly periodStatusLabel = computed(() => {
    if (this.isPastPeriod()) return 'Período cerrado';
    if (this.isFuturePeriod()) return 'Período futuro';
    return 'Período actual';
  });

  readonly pinnedAccounts = this.accountsStore.pinnedAccounts;

  readonly selectedMovement = signal<Movement | null>(null);

  readonly isMovementDetailOpen = computed(() => this.selectedMovement() !== null);

  readonly editingMovement = signal<Movement | null>(null);

  readonly isEditFormOpen = computed(() => this.editingMovement() !== null);

  readonly recentMovements = computed(() => this.periodMovements().slice(0, 5));

  readonly accountSubtext = (account: Account): string => {
    const format = (value: number): string =>
      this.userPreferencesStore.hideBalance() ? '--.--' : formatCentsToCurrency(value);

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

  openEditMovement(movement: Movement): void {
    if (this.isPastPeriod()) return;

    this.selectedMovement.set(null);
    this.editingMovement.set(movement);
  }

  closeEditMovement(): void {
    this.editingMovement.set(null);
  }
}
