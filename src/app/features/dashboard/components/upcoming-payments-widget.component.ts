import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {CurrencyPipe} from '@angular/common';
import {RouterLink} from '@angular/router';
import {MOVEMENT_TYPE_PALETTE, RECURRENCE_FREQUENCY_LABEL} from '@core/constants';
import {ScheduledTransaction} from '@core/models';
import {AccountsStore} from '@core/stores/accounts.store';
import {CatalogStore} from '@core/stores/catalog.store';
import {ScheduledTransactionsStore} from '@core/stores/scheduled-transactions.store';
import {formatLocalDate, isScheduleDue, toSoftCategoryColor} from '@core/utils';
import {ExecuteScheduleModalComponent} from '@features/scheduled/components';
import {AppIconComponent} from '@shared/components';

const MAX_UPCOMING_ITEMS = 5;
const FALLBACK_CATEGORY_COLOR = '#94a3b8';

interface StatusPill {
  label: string;
  chip: string;
}

@Component({
  selector: 'app-upcoming-payments-widget',
  imports: [CurrencyPipe, RouterLink, ExecuteScheduleModalComponent, AppIconComponent],
  templateUrl: './upcoming-payments-widget.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpcomingPaymentsWidgetComponent {
  readonly scheduledStore = inject(ScheduledTransactionsStore);
  readonly accountsStore = inject(AccountsStore);
  readonly catalogStore = inject(CatalogStore);

  readonly upcoming = computed<ScheduledTransaction[]>(() => {
    const due = this.scheduledStore.dueTodayOrOverdue();
    const future = this.scheduledStore.upcomingInTimeframe();
    const merged = [...due, ...future].sort((first, second) =>
      first.nextExecutionDate.localeCompare(second.nextExecutionDate),
    );
    const seen = new Set<string>();
    const unique = merged.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
    return unique.slice(0, MAX_UPCOMING_ITEMS);
  });

  readonly executeOpen = signal(false);
  readonly scheduleToExecute = signal<ScheduledTransaction | null>(null);

  readonly timeframeDays = this.scheduledStore.timeframeFilterDays;

  protected readonly amountPalette = MOVEMENT_TYPE_PALETTE;

  protected readonly frequencyLabel = (schedule: ScheduledTransaction): string =>
    RECURRENCE_FREQUENCY_LABEL[schedule.frequency];

  protected readonly amountSign = (schedule: ScheduledTransaction): string =>
    this.amountPalette[schedule.type].sign;

  protected readonly amountText = (schedule: ScheduledTransaction): string =>
    this.amountPalette[schedule.type].text;

  protected readonly category = (schedule: ScheduledTransaction) =>
    this.catalogStore.categories().find((item) => item.id === schedule.categoryId) ?? null;

  protected readonly categoryIcon = (schedule: ScheduledTransaction) =>
    this.category(schedule)?.icon ?? 'folder-open';

  protected readonly categoryColor = (schedule: ScheduledTransaction) =>
    this.category(schedule)?.color ?? FALLBACK_CATEGORY_COLOR;

  protected readonly categoryBackground = (schedule: ScheduledTransaction) =>
    toSoftCategoryColor(this.categoryColor(schedule), '20');

  protected readonly canExecute = (schedule: ScheduledTransaction): boolean =>
    schedule.active && isScheduleDue(schedule.nextExecutionDate, this.scheduledStore.today());

  protected readonly statusPill = (schedule: ScheduledTransaction): StatusPill => {
    const today = this.scheduledStore.today();

    if (schedule.nextExecutionDate < today) {
      return {
        label: 'Vencido',
        chip: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
      };
    }

    if (schedule.nextExecutionDate === today) {
      return {
        label: 'Hoy',
        chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
      };
    }

    return {
      label: `Disponible el ${formatLocalDate(schedule.nextExecutionDate).slice(0, 5)}`,
      chip: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    };
  };

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

  cancelOccurrence(schedule: ScheduledTransaction): void {
    this.scheduledStore.cancelScheduledOccurrence(schedule.id);
  }
}