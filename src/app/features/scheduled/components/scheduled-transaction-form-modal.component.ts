import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {
  MOVEMENT_TYPE_LABEL,
  RECURRENCE_FREQUENCY_LABEL,
  SCHEDULED_TRANSACTION_STOP_CONDITION_LABEL,
} from '@core/constants';
import {Account, Category, ScheduledTransaction, SelectOption} from '@core/models';
import {AccountsStore} from '@core/stores/accounts.store';
import {CatalogStore} from '@core/stores/catalog.store';
import {ScheduledTransactionsStore} from '@core/stores/scheduled-transactions.store';
import {
  RecurrenceFrequency,
  ScheduledTransactionStopCondition,
  ScheduledTransactionType,
} from '@core/types';
import {accountColor, toIconName, todayIsoDate} from '@core/utils';
import {AppSelectComponent, ModalComponent} from '@shared/components';
import {CurrencyInputDirective} from '@shared/directives';
import {AppIconComponent} from '@shared/components/app-icon/app-icon.component';

@Component({
  selector: 'app-scheduled-transaction-form-modal',
  imports: [
    ReactiveFormsModule,
    ModalComponent,
    CurrencyInputDirective,
    AppIconComponent,
    AppSelectComponent,
  ],
  templateUrl: './scheduled-transaction-form-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduledTransactionFormModalComponent {
  readonly isOpen = input(false);
  readonly schedule = input<ScheduledTransaction | null>(null);

  readonly closed = output<void>();

  readonly accountsStore = inject(AccountsStore);
  readonly catalogStore = inject(CatalogStore);
  readonly scheduledStore = inject(ScheduledTransactionsStore);

  readonly accounts = this.accountsStore.accounts;

  private readonly fb = inject(FormBuilder);

  protected readonly form = this.fb.group({
    name: this.fb.control<string>('', Validators.required),
    estimatedAmount: this.fb.control<number>(0, [Validators.required, Validators.min(0.01)]),
    type: this.fb.control<ScheduledTransactionType>('EXPENSE', Validators.required),
    categoryId: this.fb.control<string>('', Validators.required),
    sourceAccountId: this.fb.control<string>('', Validators.required),
    destinationAccountId: this.fb.control<string>('', Validators.required),
    frequency: this.fb.control<RecurrenceFrequency>('MONTHLY', Validators.required),
    nextExecutionDate: this.fb.control<string>('', Validators.required),
    autoApply: this.fb.control<boolean>(false),
    stopCondition: this.fb.control<ScheduledTransactionStopCondition>('NEVER'),
    totalOccurrences: this.fb.control<number | null>(null),
    endDate: this.fb.control<string | null>(null),
  });

  readonly selectedType = signal<ScheduledTransactionType>('EXPENSE');
  readonly sourceAccountId = signal('');
  readonly stopCondition = signal<ScheduledTransactionStopCondition>('NEVER');

  protected readonly title = computed(() =>
    this.schedule() ? 'Editar programado' : 'Nuevo programado',
  );

  protected readonly typeOptions: Array<{value: ScheduledTransactionType; label: string}> = [
    {value: 'INCOME', label: MOVEMENT_TYPE_LABEL.INCOME},
    {value: 'EXPENSE', label: MOVEMENT_TYPE_LABEL.EXPENSE},
    {value: 'TRANSFER', label: MOVEMENT_TYPE_LABEL.TRANSFER},
  ];

  protected readonly frequencyOptions: Array<{value: RecurrenceFrequency; label: string}> = (
    Object.keys(RECURRENCE_FREQUENCY_LABEL) as RecurrenceFrequency[]
  ).map((value) => ({value, label: RECURRENCE_FREQUENCY_LABEL[value]}));

  protected readonly stopConditionOptions: Array<{
    value: ScheduledTransactionStopCondition;
    label: string;
  }> = (
    Object.keys(SCHEDULED_TRANSACTION_STOP_CONDITION_LABEL) as ScheduledTransactionStopCondition[]
  ).map((value) => ({value, label: SCHEDULED_TRANSACTION_STOP_CONDITION_LABEL[value]}));

  readonly availableCategories = computed<Category[]>(() =>
    this.catalogStore.categoriesForType(this.selectedType()),
  );

  readonly destinationAccounts = computed(() =>
    this.accounts().filter((account) => account.id !== this.sourceAccountId()),
  );

  readonly categoryOptions = computed<SelectOption[]>(() =>
    this.availableCategories().map((category) => ({
      value: category.id,
      label: category.displayName,
      icon: category.icon,
      color: category.color,
    })),
  );

  readonly accountOptions = computed<SelectOption[]>(() =>
    this.accounts().map((account) => this.toAccountOption(account)),
  );

  readonly destinationAccountOptions = computed<SelectOption[]>(() =>
    this.destinationAccounts().map((account) => this.toAccountOption(account)),
  );

  constructor() {
    const typeControl = this.form.controls.type;
    const sourceControl = this.form.controls.sourceAccountId;
    const categoryControl = this.form.controls.categoryId;
    const destinationControl = this.form.controls.destinationAccountId;

    typeControl.valueChanges.pipe(takeUntilDestroyed()).subscribe((type) => {
      const value = type ?? 'EXPENSE';
      this.selectedType.set(value);
      this.syncValidators(value);
    });

    sourceControl.valueChanges.pipe(takeUntilDestroyed()).subscribe((source) => {
      this.sourceAccountId.set(source ?? '');
      if (destinationControl.value && destinationControl.value === source) {
        destinationControl.setValue(this.accounts().find((a) => a.id !== source)?.id ?? '');
      }
    });

    this.form.controls.stopCondition.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      const condition = value ?? 'NEVER';
      this.stopCondition.set(condition);
      this.syncStopCondition(condition);
    });

    effect(() => {
      if (!this.isOpen()) return;

      const current = this.schedule();
      const accounts = untracked(() => this.accounts());
      const type = current?.type ?? 'EXPENSE';
      const stopCondition = current ? this.resolveStopCondition(current) : 'NEVER';

      this.form.reset({
        name: current?.name ?? '',
        estimatedAmount: current?.estimatedAmount ?? 0,
        type,
        categoryId: current?.categoryId ?? '',
        sourceAccountId: current?.sourceAccountId ?? accounts[0]?.id ?? '',
        destinationAccountId: current?.destinationAccountId ?? '',
        frequency: current?.frequency ?? 'MONTHLY',
        nextExecutionDate: current?.nextExecutionDate ?? todayIsoDate(),
        autoApply: current?.autoApply ?? false,
        stopCondition,
        totalOccurrences: current?.totalOccurrences ?? null,
        endDate: current?.endDate ?? null,
      });

      this.selectedType.set(type);
      this.sourceAccountId.set(current?.sourceAccountId ?? accounts[0]?.id ?? '');
      this.stopCondition.set(stopCondition);
      this.syncValidators(type);
      this.syncStopCondition(stopCondition);
    });

    effect(() => {
      const available = this.accounts();
      const current = sourceControl.value;
      if (!current || available.some((account) => account.id === current)) return;

      const first = available[0];
      if (first) sourceControl.setValue(first.id);
    });

    effect(() => {
      if (!this.isOpen()) return;

      const type = this.selectedType();
      const list = this.availableCategories();

      if (type === 'TRANSFER') {
        const transferCategory = this.catalogStore.transferCategory() ?? list[0];
        if (transferCategory) categoryControl.setValue(transferCategory.id);
        return;
      }

      if (list.length === 0) {
        categoryControl.setValue('');
        return;
      }

      const current = categoryControl.value;
      if (current && list.some((category) => category.id === current)) return;
      categoryControl.setValue(list[0].id);
    });
  }

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const raw = this.form.getRawValue();
    const name = raw.name?.trim() ?? '';
    if (!name) return;

    const isTransfer = raw.type === 'TRANSFER';
    const destinationId = isTransfer ? (raw.destinationAccountId ?? '') : '';
    if (isTransfer && (!destinationId || destinationId === raw.sourceAccountId)) return;

    const stopCondition = raw.stopCondition ?? 'NEVER';
    const base = {
      name,
      estimatedAmount: raw.estimatedAmount ?? 0,
      type: raw.type ?? ('EXPENSE' as ScheduledTransactionType),
      categoryId: raw.categoryId ?? '',
      sourceAccountId: raw.sourceAccountId ?? '',
      destinationAccountId: isTransfer ? destinationId : undefined,
      frequency: raw.frequency ?? ('MONTHLY' as RecurrenceFrequency),
      nextExecutionDate: raw.nextExecutionDate ?? todayIsoDate(),
      autoApply: raw.autoApply ?? false,
      active: this.schedule()?.active ?? true,
      totalOccurrences:
        stopCondition === 'OCCURRENCES' ? (raw.totalOccurrences ?? undefined) : undefined,
      endDate: stopCondition === 'DATE' ? (raw.endDate ?? undefined) : undefined,
    };

    const existing = this.schedule();

    if (existing) {
      this.scheduledStore.updateScheduledTransaction({
        ...existing,
        ...base,
        completedOccurrences: existing.completedOccurrences,
      });
    } else {
      this.scheduledStore.createScheduledTransaction(base);
    }

    this.closed.emit();
  }

  errorFor(field: keyof typeof this.form.controls): string | null {
    const control = this.form.controls[field];
    if (!control.touched || !control.errors) return null;
    if (control.hasError('required')) return 'Este campo es obligatorio.';
    if (control.hasError('min')) return 'Ingresa un monto mayor a cero.';
    return 'Valor inválido.';
  }

  private resolveStopCondition(item: ScheduledTransaction): ScheduledTransactionStopCondition {
    if (item.totalOccurrences !== undefined) return 'OCCURRENCES';
    if (item.endDate !== undefined) return 'DATE';
    return 'NEVER';
  }

  private toAccountOption(account: Account): SelectOption {
    return {
      value: account.id,
      label: account.name,
      icon: toIconName(account.icon, 'wallet'),
      color: accountColor(account.color).chip,
    };
  }

  private syncValidators(type: ScheduledTransactionType): void {
    const destination = this.form.controls.destinationAccountId;

    if (type === 'TRANSFER') {
      destination.enable();
      destination.setValidators(Validators.required);
    } else {
      destination.disable();
      destination.setValue('');
      destination.clearValidators();
    }

    destination.updateValueAndValidity();
  }

  private syncStopCondition(condition: ScheduledTransactionStopCondition): void {
    const occurrences = this.form.controls.totalOccurrences;
    const endDate = this.form.controls.endDate;

    if (condition === 'OCCURRENCES') {
      occurrences.enable();
      occurrences.setValidators([Validators.required, Validators.min(1)]);
      endDate.disable();
      endDate.setValue(null);
      endDate.clearValidators();
    } else if (condition === 'DATE') {
      endDate.enable();
      endDate.setValidators(Validators.required);
      occurrences.disable();
      occurrences.setValue(null);
      occurrences.clearValidators();
    } else {
      occurrences.disable();
      occurrences.setValue(null);
      occurrences.clearValidators();
      endDate.disable();
      endDate.setValue(null);
      endDate.clearValidators();
    }

    occurrences.updateValueAndValidity();
    endDate.updateValueAndValidity();
  }
}
