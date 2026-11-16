import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {DistributionChartItem, Movement, ScheduledTransaction} from '@core/models';
import {AccountsStore} from '@core/stores/accounts.store';
import {GlobalPeriodStore} from '@core/stores/global-period.store';
import {MovementsStore} from '@core/stores/movements.store';
import {ScheduledTransactionsStore} from '@core/stores/scheduled-transactions.store';
import {MovementFilterType} from '@core/types';
import {toPeriod, toSoftCategoryColor} from '@core/utils';
import {AppIconComponent, MovementListComponent} from '@shared/components';
import {ExecuteScheduleModalComponent} from './components/execute-schedule-modal.component';
import {ScheduledDistributionChartComponent} from './components/scheduled-distribution-chart/scheduled-distribution-chart.component';
import {ScheduledFiltrosModalComponent} from './components/scheduled-filtros-modal/scheduled-filtros-modal.component';
import {ScheduledTransactionCardComponent} from './components/scheduled-transaction-card.component';
import {ScheduledTransactionFormModalComponent} from './components/scheduled-transaction-form-modal.component';
import {PrivacyCurrencyPipe} from '@shared/pipes/privacy-currency.pipe';

type DistributionType = 'EXPENSE' | 'INCOME';
type MobileSection = 'summary' | 'transactions';

@Component({
  selector: 'app-scheduled-transactions',
  imports: [
    PrivacyCurrencyPipe,
    AppIconComponent,
    MovementListComponent,
    ScheduledTransactionCardComponent,
    ScheduledTransactionFormModalComponent,
    ExecuteScheduleModalComponent,
    ScheduledDistributionChartComponent,
    ScheduledFiltrosModalComponent,
  ],
  templateUrl: './scheduled-transactions.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduledTransactionsComponent {
  readonly scheduledStore = inject(ScheduledTransactionsStore);
  readonly accountsStore = inject(AccountsStore);
  private readonly movementsStore = inject(MovementsStore);
  private readonly globalPeriodStore = inject(GlobalPeriodStore);

  readonly selectedPeriodKey = this.globalPeriodStore.selectedPeriodKey;
  readonly formattedPeriodLabel = this.globalPeriodStore.formattedPeriodLabel;
  readonly formattedPeriodLabelCompact = this.globalPeriodStore.formattedPeriodLabelCompact;
  readonly isPastPeriod = this.globalPeriodStore.isPastPeriod;

  readonly summary = this.scheduledStore.monthlyCommitmentsSummary;
  readonly projectedBalance = this.scheduledStore.netImpact;
  readonly commitmentPercentage = this.scheduledStore.incomeCommitmentPercentage;
  readonly hasFilters = computed(
    () =>
      this.scheduledStore.searchQuery().trim().length > 0 ||
      this.scheduledStore.typeFilter() !== 'ALL' ||
      this.scheduledStore.selectedCategoryId() !== null,
  );

  readonly toSoftCategoryColor = toSoftCategoryColor;

  /** Scheduled payments that were actually applied inside the selected period. */
  readonly appliedMovements = computed<Movement[]>(() =>
    this.movementsStore
      .visibleMovements()
      .filter(
        (movement) =>
          Boolean(movement.scheduledTransactionId) &&
          !movement.isCanceled &&
          !movement.isReversal &&
          toPeriod(movement.date) === this.selectedPeriodKey(),
      ),
  );

  private readonly appliedScheduleIds = computed(
    () => new Set(this.appliedMovements().map((movement) => movement.scheduledTransactionId)),
  );

  /**
   * Pending schedules of the active period. Past months only keep schedules
   * with an applied occurrence, the current month also keeps overdue items,
   * and future months only keep their own projections.
   */
  readonly filteredSchedules = computed<ScheduledTransaction[]>(() => {
    const periodKey = this.selectedPeriodKey();
    const base = this.scheduledStore.filteredSchedules();
    const applied = this.appliedScheduleIds();

    if (this.isPastPeriod()) {
      return base.filter((schedule) => applied.has(schedule.id));
    }

    return base.filter((schedule) => {
      const schedulePeriod = toPeriod(schedule.nextExecutionDate);
      if (!schedulePeriod) return false;

      return this.globalPeriodStore.isCurrentPeriod()
        ? schedulePeriod <= periodKey
        : schedulePeriod === periodKey;
    });
  });

  readonly distributionType = signal<DistributionType>('EXPENSE');

  readonly distributionItems = computed(() =>
    this.distributionType() === 'INCOME'
      ? this.scheduledStore.incomeCategoryDistributionSummary()
      : this.scheduledStore.categoryDistributionSummary(),
  );

  readonly chartType = computed<'expense' | 'income'>(() =>
    this.distributionType() === 'INCOME' ? 'income' : 'expense',
  );

  readonly chartDistributionData = computed<DistributionChartItem[]>(() =>
    this.distributionItems().map((item) => ({
      categoryId: item.categoryId,
      categoryName: item.categoryName,
      color: item.categoryColor,
      amount: item.totalAmount,
      percentage: item.percentage,
    })),
  );

  readonly chartTotalAmount = computed(() =>
    this.distributionType() === 'INCOME'
      ? this.summary().totalIncome
      : this.summary().totalExpenses,
  );

  readonly chartAvailableAmount = computed(() =>
    this.distributionType() === 'INCOME'
      ? 0
      : this.summary().totalIncome - this.summary().totalExpenses,
  );

  readonly movementsCount = computed(() =>
    this.isPastPeriod() ? this.appliedMovements().length : this.filteredSchedules().length,
  );

  readonly mobileSection = signal<MobileSection>('summary');

  readonly filtersOpen = signal(false);

  readonly activeFilterCount = computed(() => {
    let count = 0;
    if (this.scheduledStore.searchQuery().trim().length > 0) count++;
    if (this.scheduledStore.typeFilter() !== 'ALL') count++;
    if (this.scheduledStore.selectedCategoryId() !== null) count++;
    return count;
  });

  readonly listCounterLabel = computed(() => {
    if (this.isPastPeriod()) {
      return `${this.appliedMovements().length} pago${
        this.appliedMovements().length === 1 ? '' : 's'
      } aplicado${this.appliedMovements().length === 1 ? '' : 's'} en el período`;
    }

    const shown = this.filteredSchedules().length;
    const total = this.scheduledStore.scheduledTransactions().length;
    return `Mostrando ${shown} de ${total} movimientos programados`;
  });

  readonly formOpen = signal(false);
  readonly scheduleToEdit = signal<ScheduledTransaction | null>(null);

  readonly executeOpen = signal(false);
  readonly scheduleToExecute = signal<ScheduledTransaction | null>(null);

  protected readonly commitmentLabel = computed(() => `${this.commitmentPercentage()}%`);

  protected readonly commitmentBarColor = computed(() => {
    const percentage = this.commitmentPercentage();
    if (percentage >= 75) return 'bg-rose-500';
    if (percentage >= 50) return 'bg-amber-500';
    return 'bg-emerald-500';
  });

  openCreate(): void {
    if (this.isPastPeriod()) return;

    this.scheduleToEdit.set(null);
    this.formOpen.set(true);
  }

  openEdit(schedule: ScheduledTransaction): void {
    if (this.isPastPeriod()) return;

    this.scheduleToEdit.set(schedule);
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.scheduleToEdit.set(null);
  }

  openExecute(schedule: ScheduledTransaction): void {
    if (this.isPastPeriod()) return;

    this.scheduleToExecute.set(schedule);
    this.executeOpen.set(true);
  }

  closeExecute(): void {
    this.executeOpen.set(false);
    this.scheduleToExecute.set(null);
  }

  applyExecution(amount: number): void {
    const schedule = this.scheduleToExecute();
    if (!schedule || this.isPastPeriod()) return;

    this.scheduledStore.executeScheduledTransaction(schedule.id, amount);
    this.closeExecute();
  }

  cancelOccurrence(schedule: ScheduledTransaction): void {
    if (this.isPastPeriod()) return;

    this.scheduledStore.cancelScheduledOccurrence(schedule.id);
  }

  onSearch(query: string): void {
    this.scheduledStore.setSearchQuery(query);
  }

  setDistributionType(type: DistributionType): void {
    this.distributionType.set(type);
  }

  selectMobileSection(section: MobileSection): void {
    this.mobileSection.set(section);
  }

  onTypeFilterChange(type: MovementFilterType): void {
    this.scheduledStore.setTypeFilter(type);
  }

  onCategorySelected(categoryId: string | null): void {
    this.scheduledStore.setCategoryFilter(categoryId);
  }

  resetFilters(): void {
    this.scheduledStore.resetFilters();
  }

  clearCategoryFilter(): void {
    this.scheduledStore.setCategoryFilter(null);
  }
}
