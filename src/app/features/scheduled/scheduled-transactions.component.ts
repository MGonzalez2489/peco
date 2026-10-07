import {CurrencyPipe} from '@angular/common';
import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {DistributionChartItem, ScheduledTransaction} from '@core/models';
import {AccountsStore} from '@core/stores/accounts.store';
import {ScheduledTransactionsStore} from '@core/stores/scheduled-transactions.store';
import {toSoftCategoryColor} from '@core/utils';
import {AppIconComponent} from '@shared/components/app-icon/app-icon.component';
import {ExecuteScheduleModalComponent} from './components/execute-schedule-modal.component';
import {ScheduledDistributionChartComponent} from './components/scheduled-distribution-chart/scheduled-distribution-chart.component';
import {ScheduledFilterBarComponent} from './components/scheduled-filter-bar/scheduled-filter-bar.component';
import {ScheduledTransactionCardComponent} from './components/scheduled-transaction-card.component';
import {ScheduledTransactionFormModalComponent} from './components/scheduled-transaction-form-modal.component';

type DistributionType = 'EXPENSE' | 'INCOME';
type MobileSection = 'summary' | 'transactions';

@Component({
  selector: 'app-scheduled-transactions',
  imports: [
    CurrencyPipe,
    AppIconComponent,
    ScheduledTransactionCardComponent,
    ScheduledTransactionFormModalComponent,
    ExecuteScheduleModalComponent,
    ScheduledFilterBarComponent,
    ScheduledDistributionChartComponent,
  ],
  templateUrl: './scheduled-transactions.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduledTransactionsComponent {
  readonly scheduledStore = inject(ScheduledTransactionsStore);
  readonly accountsStore = inject(AccountsStore);

  readonly summary = this.scheduledStore.monthlyCommitmentsSummary;
  readonly projectedBalance = this.scheduledStore.netImpact;
  readonly commitmentPercentage = this.scheduledStore.incomeCommitmentPercentage;
  readonly filteredSchedules = this.scheduledStore.filteredSchedules;
  readonly hasFilters = computed(
    () =>
      this.scheduledStore.searchQuery().trim().length > 0 ||
      this.scheduledStore.typeFilter() !== 'ALL' ||
      this.scheduledStore.selectedCategoryId() !== null,
  );

  readonly toSoftCategoryColor = toSoftCategoryColor;

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

  readonly movementsCount = computed(() => this.filteredSchedules().length);

  readonly mobileSection = signal<MobileSection>('summary');

  readonly listCounterLabel = computed(() => {
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
    this.scheduleToEdit.set(null);
    this.formOpen.set(true);
  }

  openEdit(schedule: ScheduledTransaction): void {
    this.scheduleToEdit.set(schedule);
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.scheduleToEdit.set(null);
  }

  openExecute(schedule: ScheduledTransaction): void {
    this.scheduleToExecute.set(schedule);
    this.executeOpen.set(true);
  }

  closeExecute(): void {
    this.executeOpen.set(false);
    this.scheduleToExecute.set(null);
  }

  applyExecution(amount: number): void {
    const schedule = this.scheduleToExecute();
    if (!schedule) return;

    this.scheduledStore.executeScheduledTransaction(schedule.id, amount);
    this.closeExecute();
  }

  cancelOccurrence(schedule: ScheduledTransaction): void {
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

  onTypeFilterChange(type: 'ALL' | 'INCOME' | 'EXPENSE'): void {
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
