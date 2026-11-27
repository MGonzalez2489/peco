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
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {
  RECURRENCE_FREQUENCY_LABEL,
  SCHEDULED_TRANSACTION_STOP_CONDITION_LABEL,
  SCHEDULED_TRANSACTION_TYPES,
} from '@core/constants';
import {Category, ScheduledTransaction, SelectOption} from '@core/models';
import {AccountsStore} from '@core/stores/accounts.store';
import {CatalogStore} from '@core/stores/catalog.store';
import {ScheduledTransactionsStore} from '@core/stores/scheduled-transactions.store';
import {
  RecurrenceFrequency,
  ScheduledTransactionStopCondition,
  ScheduledTransactionTypeKey,
} from '@core/types';
import {
  accountColor,
  defaultStopDate,
  fromCents,
  isFutureDate,
  resolveScheduledTransactionType,
  toAccountOption,
  toCents,
  toCategoryOption,
  toMovementType,
  tomorrowIsoDate,
} from '@core/utils';
import {
  AppIconComponent,
  AppSelectComponent,
  DatePickerComponent,
  ModalComponent,
} from '@shared/components';
import {CurrencyInputDirective} from '@shared/directives';
import {
  RecurrenceFrequencyEnum,
  ScheduledTransactionStopConditionEnum,
  ScheduledTransactionTypeEnum,
} from '@peco/enums';

const futureDateValidator = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value as string | null;
  if (!value) return null;
  return isFutureDate(value) ? null : {pastDate: true};
};

@Component({
  selector: 'app-scheduled-transaction-form-modal',
  imports: [
    ReactiveFormsModule,
    ModalComponent,
    CurrencyInputDirective,
    AppIconComponent,
    AppSelectComponent,
    DatePickerComponent,
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

  private endDateIsDefault = false;

  protected readonly form = this.fb.group({
    name: this.fb.control<string>('', Validators.required),
    estimatedAmount: this.fb.control<number>(0, [Validators.required, Validators.min(0.01)]),
    type: this.fb.control<ScheduledTransactionTypeKey>(
      ScheduledTransactionTypeEnum.EXPENSE.toString(),
      Validators.required,
    ),
    categoryId: this.fb.control<string>('', Validators.required),
    sourceAccountId: this.fb.control<string>('', Validators.required),
    destinationAccountId: this.fb.control<string>('', Validators.required),
    frequency: this.fb.control<RecurrenceFrequency>(RecurrenceFrequencyEnum.MONTHLY.toString()),
    interval: this.fb.control<number>(1, [
      Validators.required,
      Validators.min(1),
      Validators.max(999),
    ]),
    nextExecutionDate: this.fb.control<string>('', [Validators.required, futureDateValidator]),
    autoApply: this.fb.control<boolean>(false),
    stopCondition: this.fb.control<ScheduledTransactionStopCondition>(
      ScheduledTransactionStopConditionEnum.NEVER.toString(),
    ),
    totalOccurrences: this.fb.control<number | null>(null),
    endDate: this.fb.control<string | null>(null),
  });

  readonly selectedType = signal<ScheduledTransactionTypeKey>(
    ScheduledTransactionTypeEnum.EXPENSE.toString(),
  );
  readonly sourceAccountId = signal('');
  readonly stopCondition = signal<ScheduledTransactionStopCondition>(
    ScheduledTransactionStopConditionEnum.NEVER.toString(),
  );

  protected readonly typeKeys = {
    INCOME: ScheduledTransactionTypeEnum.INCOME.toString(),
    EXPENSE: ScheduledTransactionTypeEnum.EXPENSE.toString(),
    TRANSFER: ScheduledTransactionTypeEnum.TRANSFER.toString(),
  };

  protected readonly stopConditions = {
    NEVER: ScheduledTransactionStopConditionEnum.NEVER.toString(),
    OCCURRENCES: ScheduledTransactionStopConditionEnum.OCCURRENCES.toString(),
    DATE: ScheduledTransactionStopConditionEnum.DATE.toString(),
  };

  protected readonly title = computed(() =>
    this.schedule() ? 'Editar programado' : 'Nuevo programado',
  );

  protected get minNextExecutionDate(): string {
    return tomorrowIsoDate();
  }

  protected readonly typeOptions: SelectOption[] = SCHEDULED_TRANSACTION_TYPES.map((type) => ({
    value: type.key,
    label: type.name,
    icon: type.icon,
    color: accountColor(type.color).chip,
  }));

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
    this.catalogStore.categoriesForType(toMovementType(this.selectedType())),
  );

  readonly destinationAccounts = computed(() =>
    this.accounts().filter((account) => account.id !== this.sourceAccountId()),
  );

  readonly categoryOptions = computed<SelectOption[]>(() =>
    this.availableCategories().map((category) => toCategoryOption(category)),
  );

  readonly accountOptions = computed<SelectOption[]>(() =>
    this.accounts().map((account) => toAccountOption(account)),
  );

  readonly destinationAccountOptions = computed<SelectOption[]>(() =>
    this.destinationAccounts().map((account) => toAccountOption(account)),
  );

  constructor() {
    const typeControl = this.form.controls.type;
    const sourceControl = this.form.controls.sourceAccountId;
    const categoryControl = this.form.controls.categoryId;
    const destinationControl = this.form.controls.destinationAccountId;

    typeControl.valueChanges.pipe(takeUntilDestroyed()).subscribe((type) => {
      const value = type ?? ScheduledTransactionTypeEnum.EXPENSE.toString();
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
      const condition = value ?? ScheduledTransactionStopConditionEnum.NEVER.toString();
      this.stopCondition.set(condition);
      this.syncStopCondition(condition);
    });

    this.form.controls.endDate.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => (this.endDateIsDefault = false));

    this.form.controls.frequency.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.refreshDefaultEndDate());

    this.form.controls.interval.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.refreshDefaultEndDate());

    this.form.controls.nextExecutionDate.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.refreshDefaultEndDate());

    effect(() => {
      if (!this.isOpen()) return;

      const current = this.schedule();
      const accounts = untracked(() => this.accounts());
      const type = current?.type.key ?? ScheduledTransactionTypeEnum.EXPENSE.toString();
      const stopCondition = current
        ? this.resolveStopCondition(current)
        : ScheduledTransactionStopConditionEnum.NEVER.toString();

      this.form.reset({
        name: current?.name ?? '',
        estimatedAmount: current ? fromCents(current.estimatedAmount) : 0,
        type,
        categoryId: current?.categoryId ?? '',
        sourceAccountId: current?.sourceAccountId ?? accounts[0]?.id ?? '',
        destinationAccountId: current?.destinationAccountId ?? '',
        frequency: current?.frequency ?? RecurrenceFrequencyEnum.MONTHLY.toString(),
        interval: current?.interval ?? 1,
        nextExecutionDate: current?.nextExecutionDate ?? tomorrowIsoDate(),
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

      if (type === ScheduledTransactionTypeEnum.TRANSFER.toString()) {
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

    const isTransfer = raw.type === ScheduledTransactionTypeEnum.TRANSFER.toString();
    const destinationId = isTransfer ? (raw.destinationAccountId ?? '') : '';
    if (isTransfer && (!destinationId || destinationId === raw.sourceAccountId)) return;

    const stopCondition =
      raw.stopCondition ?? ScheduledTransactionStopConditionEnum.NEVER.toString();
    const base = {
      name,
      // The input works in decimal dollars; schedules persist integer cents.
      estimatedAmount: toCents(raw.estimatedAmount ?? 0),
      type: resolveScheduledTransactionType(raw.type),
      categoryId: raw.categoryId ?? '',
      sourceAccountId: raw.sourceAccountId ?? '',
      destinationAccountId: isTransfer ? destinationId : undefined,
      frequency:
        raw.frequency ?? (RecurrenceFrequencyEnum.MONTHLY.toString() as RecurrenceFrequency),
      interval: raw.interval ?? 1,
      nextExecutionDate: raw.nextExecutionDate ?? tomorrowIsoDate(),
      autoApply: raw.autoApply ?? false,
      active: this.schedule()?.active ?? true,
      totalOccurrences:
        stopCondition === ScheduledTransactionStopConditionEnum.OCCURRENCES.toString()
          ? (raw.totalOccurrences ?? undefined)
          : undefined,
      endDate:
        stopCondition === ScheduledTransactionStopConditionEnum.DATE.toString()
          ? (raw.endDate ?? undefined)
          : undefined,
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
    if (control.hasError('min')) {
      return field === 'estimatedAmount'
        ? 'Ingresa un monto mayor a cero.'
        : `El valor mínimo es ${control.getError('min')?.min}.`;
    }
    if (control.hasError('max')) return `El valor máximo es ${control.getError('max')?.max}.`;
    if (control.hasError('pastDate')) return 'Selecciona una fecha a partir de mañana.';
    return 'Valor inválido.';
  }

  private resolveStopCondition(item: ScheduledTransaction): ScheduledTransactionStopCondition {
    if (item.totalOccurrences !== undefined)
      return ScheduledTransactionStopConditionEnum.OCCURRENCES.toString();
    if (item.endDate !== undefined) return ScheduledTransactionStopConditionEnum.DATE.toString();
    return ScheduledTransactionStopConditionEnum.NEVER.toString();
  }

  private syncValidators(type: ScheduledTransactionTypeKey): void {
    const destination = this.form.controls.destinationAccountId;

    if (type === ScheduledTransactionTypeEnum.TRANSFER.toString()) {
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

    if (condition === ScheduledTransactionStopConditionEnum.OCCURRENCES.toString()) {
      occurrences.enable();
      occurrences.setValidators([Validators.required, Validators.min(1)]);
      if (!occurrences.value) occurrences.setValue(1, {emitEvent: false});
      endDate.disable();
      endDate.setValue(null, {emitEvent: false});
      endDate.clearValidators();
    } else if (condition === ScheduledTransactionStopConditionEnum.DATE.toString()) {
      endDate.enable();
      endDate.setValidators(Validators.required);
      occurrences.disable();
      occurrences.setValue(null, {emitEvent: false});
      occurrences.clearValidators();
      if (!endDate.value) {
        this.endDateIsDefault = true;
        endDate.setValue(this.resolveDefaultEndDate(), {emitEvent: false});
      } else {
        this.endDateIsDefault = false;
      }
    } else {
      occurrences.disable();
      occurrences.setValue(null, {emitEvent: false});
      occurrences.clearValidators();
      endDate.disable();
      endDate.setValue(null, {emitEvent: false});
      endDate.clearValidators();
    }

    occurrences.updateValueAndValidity({emitEvent: false});
    endDate.updateValueAndValidity({emitEvent: false});
  }

  private resolveDefaultEndDate(): string {
    const frequency =
      this.form.controls.frequency.value ?? RecurrenceFrequencyEnum.MONTHLY.toString();
    const interval = this.form.controls.interval.value ?? 1;
    const nextExecutionDate = this.form.controls.nextExecutionDate.value || tomorrowIsoDate();

    return defaultStopDate(nextExecutionDate, frequency, interval);
  }

  private refreshDefaultEndDate(): void {
    if (
      this.stopCondition() !== ScheduledTransactionStopConditionEnum.DATE.toString() ||
      !this.endDateIsDefault
    )
      return;

    this.form.controls.endDate.setValue(this.resolveDefaultEndDate(), {emitEvent: false});
  }
}
