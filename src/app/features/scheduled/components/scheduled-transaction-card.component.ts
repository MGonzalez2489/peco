import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {CurrencyPipe} from '@angular/common';
import {formatLocalDate, isScheduleDue, toSoftCategoryColor} from '@core/utils';
import {RECURRENCE_FREQUENCY_LABEL} from '@core/constants';
import {ScheduledTransaction} from '@core/models';
import {CatalogStore} from '@core/stores/catalog.store';
import {AccountsStore} from '@core/stores/accounts.store';
import {ScheduledTransactionsStore} from '@core/stores/scheduled-transactions.store';
import {ScheduledTransactionType} from '@core/types';
import {AppIconComponent, ConfirmModalComponent} from '@shared/components';

const FALLBACK_CATEGORY_COLOR = '#94a3b8';

@Component({
  selector: 'app-scheduled-transaction-card',
  imports: [CurrencyPipe, ConfirmModalComponent, AppIconComponent],
  templateUrl: './scheduled-transaction-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduledTransactionCardComponent {
  readonly schedule = input.required<ScheduledTransaction>();

  readonly edited = output<ScheduledTransaction>();
  readonly executed = output<ScheduledTransaction>();
  readonly canceled = output<ScheduledTransaction>();
  readonly deleted = output<ScheduledTransaction>();

  readonly accountsStore = inject(AccountsStore);
  readonly catalogStore = inject(CatalogStore);
  readonly scheduledStore = inject(ScheduledTransactionsStore);

  protected readonly confirmDeleteVisible = signal(false);
  protected readonly isExpanded = signal(false);

  protected readonly frequencyLabel = computed(
    () => RECURRENCE_FREQUENCY_LABEL[this.schedule().frequency],
  );

  protected readonly isIncome = computed(() => this.schedule().type === 'INCOME');

  protected readonly amountPalette = computed(() =>
    this.isIncome()
      ? 'text-emerald-600 dark:text-emerald-400'
      : this.schedule().type === 'TRANSFER'
        ? 'text-sky-600 dark:text-sky-400'
        : 'text-rose-600 dark:text-rose-400',
  );

  protected readonly accountName = computed(() => {
    const source = this.accountsStore
      .accounts()
      .find((account) => account.id === this.schedule().sourceAccountId);

    return source?.name ?? 'Sin cuenta';
  });

  protected readonly destinationName = computed(() => {
    const destinationId = this.schedule().destinationAccountId;
    if (!destinationId) return null;

    return (
      this.accountsStore.accounts().find((account) => account.id === destinationId)?.name ?? null
    );
  });

  protected readonly category = computed(() => {
    const found = this.catalogStore
      .categories()
      .find((item) => item.id === this.schedule().categoryId);

    return found ?? null;
  });

  protected readonly categoryLabel = computed(
    () => this.category()?.displayName ?? 'Sin categoría',
  );

  protected readonly categoryColor = computed(
    () => this.category()?.color ?? FALLBACK_CATEGORY_COLOR,
  );

  protected readonly categoryIcon = computed(() => this.category()?.icon ?? 'folder-open');

  protected readonly categoryBadgeBackground = computed(() =>
    toSoftCategoryColor(this.categoryColor(), '20'),
  );

  protected readonly typeLabel = (type: ScheduledTransactionType): string =>
    type === 'INCOME' ? 'Ingreso' : type === 'EXPENSE' ? 'Egreso' : 'Transferencia';

  protected readonly isOverdue = computed(
    () => this.schedule().active && this.schedule().nextExecutionDate < this.scheduledStore.today(),
  );

  protected readonly canExecute = computed(
    () =>
      this.schedule().active &&
      isScheduleDue(this.schedule().nextExecutionDate, this.scheduledStore.today()),
  );

  protected readonly isFutureSchedule = computed(
    () => !isScheduleDue(this.schedule().nextExecutionDate, this.scheduledStore.today()),
  );

  protected readonly availabilityMessage = computed(
    () =>
      `Esta transacción estará disponible para aplicarse el ${formatLocalDate(this.schedule().nextExecutionDate)}`,
  );

  protected readonly nextExecutionLabel = computed(() =>
    formatLocalDate(this.schedule().nextExecutionDate),
  );

  protected readonly progressLabel = computed(() => {
    const {completedOccurrences, totalOccurrences} = this.schedule();
    if (totalOccurrences === undefined) return 'Sin fin';

    return `${completedOccurrences} de ${totalOccurrences} repeticiones`;
  });

  toggleActive(): void {
    this.scheduledStore.toggleScheduleActiveStatus(this.schedule().id);
  }

  toggleExpanded(): void {
    this.isExpanded.update((expanded) => !expanded);
  }

  requestDelete(): void {
    this.confirmDeleteVisible.set(false);
    this.scheduledStore.deleteScheduledTransaction(this.schedule().id);
    this.deleted.emit(this.schedule());
  }
}
