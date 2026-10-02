import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {CurrencyPipe} from '@angular/common';
import {RouterLink} from '@angular/router';
import {RECURRENCE_FREQUENCY_LABEL} from '@core/constants';
import {ScheduledTransaction} from '@core/models';
import {AccountsStore} from '@core/stores/accounts.store';
import {ScheduledTransactionsStore} from '@core/stores/scheduled-transactions.store';
import {formatLocalDate, isScheduleDue} from '@core/utils';
import {
  ExecuteScheduleModalComponent,
  ScheduledTransactionFormModalComponent,
} from '@features/scheduled/components';

@Component({
  selector: 'app-upcoming-payments-widget',
  imports: [
    CurrencyPipe,
    RouterLink,
    ExecuteScheduleModalComponent,
    ScheduledTransactionFormModalComponent,
  ],
  templateUrl: './upcoming-payments-widget.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpcomingPaymentsWidgetComponent {
  readonly scheduledStore = inject(ScheduledTransactionsStore);
  readonly accountsStore = inject(AccountsStore);

  readonly upcoming = this.scheduledStore.upcomingInTimeframe;

  readonly executeOpen = signal(false);
  readonly scheduleToExecute = signal<ScheduledTransaction | null>(null);

  readonly formOpen = signal(false);
  readonly scheduleToEdit = signal<ScheduledTransaction | null>(null);

  readonly timeframeDays = this.scheduledStore.timeframeFilterDays;

  protected readonly frequencyLabel = (schedule: ScheduledTransaction): string =>
    RECURRENCE_FREQUENCY_LABEL[schedule.frequency];

  protected readonly dateLabel = (schedule: ScheduledTransaction): string =>
    formatLocalDate(schedule.nextExecutionDate);

  protected readonly isOverdue = (schedule: ScheduledTransaction): boolean =>
    schedule.nextExecutionDate < this.scheduledStore.today();

  protected readonly canExecute = (schedule: ScheduledTransaction): boolean =>
    schedule.active && isScheduleDue(schedule.nextExecutionDate, this.scheduledStore.today());

  protected readonly availabilityMessage = (schedule: ScheduledTransaction): string =>
    `Esta transacción estará disponible para aplicarse el ${formatLocalDate(schedule.nextExecutionDate)}`;

  protected readonly accountName = (schedule: ScheduledTransaction): string =>
    this.accountsStore.accounts().find((account) => account.id === schedule.sourceAccountId)
      ?.name ?? 'Sin cuenta';

  protected readonly nextDueAmount = computed(() =>
    this.upcoming().reduce((total, schedule) => {
      if (schedule.type === 'INCOME') return total;
      return total + schedule.estimatedAmount;
    }, 0),
  );

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

  openEdit(schedule: ScheduledTransaction): void {
    this.scheduleToEdit.set(schedule);
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.scheduleToEdit.set(null);
  }

  cancelOccurrence(schedule: ScheduledTransaction): void {
    this.scheduledStore.cancelScheduledOccurrence(schedule.id);
  }
}
