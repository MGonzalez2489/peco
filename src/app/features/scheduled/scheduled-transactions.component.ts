import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {CurrencyPipe} from '@angular/common';
import {ScheduledTransaction} from '@core/models';
import {AccountsStore} from '@core/stores/accounts.store';
import {ScheduledTransactionsStore} from '@core/stores/scheduled-transactions.store';
import {toSoftCategoryColor} from '@core/utils';
import {ExecuteScheduleModalComponent} from './components/execute-schedule-modal.component';
import {ScheduledTransactionCardComponent} from './components/scheduled-transaction-card.component';
import {ScheduledTransactionFormModalComponent} from './components/scheduled-transaction-form-modal.component';
import {ScheduledFilterBarComponent} from './components/scheduled-filter-bar/scheduled-filter-bar.component';
import {AppIconComponent} from '@shared/components';

@Component({
  selector: 'app-scheduled-transactions',
  imports: [
    CurrencyPipe,
    ScheduledTransactionCardComponent,
    ScheduledTransactionFormModalComponent,
    ExecuteScheduleModalComponent,
    ScheduledFilterBarComponent,
    AppIconComponent,
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
  readonly categoryDistribution = this.scheduledStore.categoryDistributionSummary;
  readonly hasFilters = computed(
    () =>
      this.scheduledStore.searchQuery().trim().length > 0 ||
      this.scheduledStore.typeFilter() !== 'ALL' ||
      this.scheduledStore.selectedCategoryId() !== null,
  );

  readonly toSoftCategoryColor = toSoftCategoryColor;

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

  protected readonly donutSegments = computed(() => {
    const total = this.categoryDistribution().reduce((sum, item) => sum + item.totalAmount, 0);
    let offset = 0;
    return this.categoryDistribution().map((item) => {
      const percent = total > 0 ? (item.totalAmount / total) * 100 : 0;
      const circumference = 2 * Math.PI * 45;
      const dash = (percent / 100) * circumference;
      const segment = {
        ...item,
        dash,
        offset: circumference - (offset / 100) * circumference,
        percent,
      };
      offset += percent;
      return segment;
    });
  });

  protected readonly donutTotal = computed(() =>
    this.categoryDistribution().reduce((sum, item) => sum + item.totalAmount, 0),
  );

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
