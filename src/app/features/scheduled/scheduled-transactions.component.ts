import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {CurrencyPipe} from '@angular/common';
import {ScheduledTransaction} from '@core/models';
import {AccountsStore} from '@core/stores/accounts.store';
import {ScheduledTransactionsStore} from '@core/stores/scheduled-transactions.store';
import {ExecuteScheduleModalComponent} from './components/execute-schedule-modal.component';
import {ScheduledTransactionCardComponent} from './components/scheduled-transaction-card.component';
import {ScheduledTransactionFormModalComponent} from './components/scheduled-transaction-form-modal.component';

@Component({
  selector: 'app-scheduled-transactions',
  imports: [
    CurrencyPipe,
    ScheduledTransactionCardComponent,
    ScheduledTransactionFormModalComponent,
    ExecuteScheduleModalComponent,
  ],
  templateUrl: './scheduled-transactions.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduledTransactionsComponent {
  readonly scheduledStore = inject(ScheduledTransactionsStore);
  readonly accountsStore = inject(AccountsStore);

  readonly activeSchedules = this.scheduledStore.activeSchedules;
  readonly pausedSchedules = this.scheduledStore.pausedSchedules;
  readonly summary = this.scheduledStore.monthlyCommitmentsSummary;
  readonly projectedBalance = this.scheduledStore.projectedAvailableBalance;
  readonly commitmentPercentage = this.scheduledStore.incomeCommitmentPercentage;

  readonly formOpen = signal(false);
  readonly scheduleToEdit = signal<ScheduledTransaction | null>(null);

  readonly executeOpen = signal(false);
  readonly scheduleToExecute = signal<ScheduledTransaction | null>(null);

  protected readonly commitmentLabel = computed(() => `${this.commitmentPercentage()}%`);

  protected readonly commitmentBarColor = computed(() => {
    const percentage = this.commitmentPercentage();
    if (percentage >= 90) return 'bg-rose-500';
    if (percentage >= 70) return 'bg-amber-500';
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
}
