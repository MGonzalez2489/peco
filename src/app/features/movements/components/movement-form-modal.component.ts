import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {FormBuilder, FormControl, ReactiveFormsModule, Validators} from '@angular/forms';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {
  MOVEMENT_TYPES,
  RECURRENCE_FREQUENCY_LABEL,
  SCHEDULED_TRANSACTION_STOP_CONDITION_LABEL,
} from '@core/constants';
import {Category, SelectOption} from '@core/models';
import {AccountsStore} from '@core/stores/accounts.store';
import {CatalogStore} from '@core/stores/catalog.store';
import {MovementsStore} from '@core/stores/movements.store';
import {ScheduledTransactionsStore} from '@core/stores/scheduled-transactions.store';
import {MovementType, RecurrenceFrequency, ScheduledTransactionStopCondition} from '@core/types';
import {
  accountColor,
  defaultStopDate,
  resolveScheduledTransactionType,
  toAccountOption,
  toCategoryOption,
  todayIsoDate,
} from '@core/utils';
import {
  AppIconComponent,
  AppSelectComponent,
  DatePickerComponent,
  ModalComponent,
} from '@shared/components';
import {CurrencyInputDirective} from '@shared/directives';

interface MovementFormValue {
  amount: number | null;
  type: MovementType | null;
  accountId: string | null;
  categoryId: string | null;
  targetAccountId: string | null;
  note: string | null;
  isRecurring: boolean | null;
  frequency: RecurrenceFrequency | null;
  interval: number | null;
  autoApply: boolean | null;
  stopCondition: ScheduledTransactionStopCondition | null;
  totalOccurrences: number | null;
  endDate: string | null;
}

@Component({
  selector: 'app-movement-form-modal',
  imports: [
    ReactiveFormsModule,
    ModalComponent,
    CurrencyInputDirective,
    AppSelectComponent,
    AppIconComponent,
    DatePickerComponent,
  ],
  templateUrl: './movement-form-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MovementFormModalComponent {
  readonly isOpen = input(false);
  readonly presetType = input<MovementType>('EXPENSE');

  readonly closed = output<void>();

  readonly accountsStore = inject(AccountsStore);
  readonly catalogStore = inject(CatalogStore);
  readonly movementsStore = inject(MovementsStore);
  readonly scheduledStore = inject(ScheduledTransactionsStore);

  readonly accounts = this.accountsStore.accounts;

  private readonly fb = inject(FormBuilder);

  private endDateIsDefault = false;

  protected readonly form = this.fb.group({
    amount: this.fb.control<number>(0, {
      validators: [Validators.required, Validators.min(0.01)],
    }),
    type: this.fb.control<MovementType>('EXPENSE', Validators.required),
    accountId: this.fb.control<string>('', Validators.required),
    categoryId: this.fb.control<string>('', Validators.required),
    targetAccountId: this.fb.control<string | null>(null),
    note: this.fb.control<string>(''),
    isRecurring: this.fb.control<boolean>(false),
    frequency: this.fb.control<RecurrenceFrequency>('MONTHLY'),
    interval: this.fb.control<number>(1, [
      Validators.required,
      Validators.min(1),
      Validators.max(999),
    ]),
    autoApply: this.fb.control<boolean>(false),
    stopCondition: this.fb.control<ScheduledTransactionStopCondition>('NEVER'),
    totalOccurrences: this.fb.control<number | null>(null),
    endDate: this.fb.control<string | null>(null),
  });

  readonly selectedType = signal<MovementType>('EXPENSE');
  readonly sourceAccountId = signal('');
  readonly isRecurring = signal(false);
  readonly stopCondition = signal<ScheduledTransactionStopCondition>('NEVER');

  readonly availableCategories = computed<Category[]>(() =>
    this.catalogStore.categoriesForType(this.selectedType()),
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

  readonly typeOptions: SelectOption[] = MOVEMENT_TYPES.map((type) => ({
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

  constructor() {
    const typeControl = this.form.controls.type;
    const sourceControl = this.form.controls.accountId;
    const destinationControl = this.form.controls.targetAccountId;
    const categoryControl = this.form.controls.categoryId;

    typeControl.valueChanges.pipe(takeUntilDestroyed()).subscribe((type) => {
      const value = type ?? 'EXPENSE';
      this.selectedType.set(value);
      this.syncDestination(value);
    });

    sourceControl.valueChanges.pipe(takeUntilDestroyed()).subscribe((source) => {
      this.sourceAccountId.set(source ?? '');
      if (typeControl.value === 'TRANSFER' && source && destinationControl.value === source) {
        destinationControl.setValue(this.accounts().find((a) => a.id !== source)?.id ?? '');
      }
    });

    this.form.controls.isRecurring.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value) => this.isRecurring.set(value ?? false));

    this.form.controls.stopCondition.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      const condition = value ?? 'NEVER';
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

    effect(() => {
      if (this.isOpen()) {
        const preset = this.presetType();
        this.form.reset({
          amount: 0,
          type: preset,
          accountId: '',
          categoryId: '',
          targetAccountId: null,
          note: '',
          isRecurring: false,
          frequency: 'MONTHLY',
          interval: 1,
          autoApply: false,
          stopCondition: 'NEVER',
          totalOccurrences: null,
          endDate: null,
        });
        this.selectedType.set(preset);
        this.sourceAccountId.set('');
        this.isRecurring.set(false);
        this.stopCondition.set('NEVER');
        this.syncStopCondition('NEVER');
        const first = this.accounts()[0];
        if (first) sourceControl.setValue(first.id);
        this.syncDestination(preset);
      }
    });

    effect(() => {
      const available = this.accounts();
      const current = sourceControl.value;
      if (current && available.some((a) => a.id === current)) return;
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
      if (current && list.some((c) => c.id === current)) return;
      categoryControl.setValue(list[0].id);
    });
  }

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const raw = this.form.getRawValue();
    const destinationId = raw.type === 'TRANSFER' ? (raw.targetAccountId ?? null) : undefined;
    if (raw.type === 'TRANSFER' && (!destinationId || destinationId === raw.accountId)) return;

    if (raw.isRecurring) {
      this.saveRecurring(raw, destinationId ?? undefined);
      this.closed.emit();
      return;
    }

    this.movementsStore.registerMovement({
      accountId: raw.accountId ?? '',
      categoryId: raw.categoryId ?? '',
      type: raw.type ?? 'EXPENSE',
      amount: raw.amount ?? 0,
      note: raw.note?.trim() || undefined,
      targetAccountId: destinationId ?? undefined,
    });

    this.closed.emit();
  }

  errorFor<T>(field: FormControl<T>): string | null {
    if (!field.touched || !field.errors) return null;
    if (field.hasError('required')) return 'Este campo es obligatorio.';
    if (field.hasError('min')) return `El valor mínimo es ${field.getError('min').min}.`;
    if (field.hasError('max')) return `El valor máximo es ${field.getError('max').max}.`;
    return 'Valor inválido.';
  }

  private saveRecurring(raw: MovementFormValue, destinationId: string | undefined): void {
    const condition = raw.stopCondition ?? 'NEVER';
    const name = raw.note?.trim() || this.categoryDisplayName(raw.categoryId ?? '');

    this.scheduledStore.createScheduledTransaction({
      name,
      estimatedAmount: raw.amount ?? 0,
      type: resolveScheduledTransactionType(raw.type),
      categoryId: raw.categoryId ?? '',
      sourceAccountId: raw.accountId ?? '',
      destinationAccountId: destinationId,
      frequency: condition === 'INTERVAL' ? (raw.frequency ?? 'MONTHLY') : undefined,
      nextExecutionDate: todayIsoDate(),
      autoApply: raw.autoApply ?? false,
      active: true,
      interval: raw.interval ?? 1,
      totalOccurrences:
        condition === 'OCCURRENCES' ? (raw.totalOccurrences ?? undefined) : undefined,
      endDate: condition === 'DATE' ? (raw.endDate ?? undefined) : undefined,
    } as any);
  }

  private categoryDisplayName(categoryId: string): string {
    const category = this.catalogStore.categories().find((item) => item.id === categoryId);
    return category?.displayName ?? 'Programado';
  }

  private syncDestination(type: MovementType): void {
    const destination = this.form.controls.targetAccountId;
    if (type === 'TRANSFER') {
      destination.enable();
      destination.setValidators(Validators.required);
    } else {
      destination.disable();
      destination.setValue(null);
      destination.clearValidators();
    }
    destination.updateValueAndValidity();
  }

  private syncStopCondition(condition: ScheduledTransactionStopCondition): void {
    const occurrences = this.form.controls.totalOccurrences;
    const endDate = this.form.controls.endDate;
    const frequency = this.form.controls.frequency;
    const interval = this.form.controls.interval as any;

    if (condition === 'OCCURRENCES') {
      occurrences.enable();
      occurrences.setValidators([Validators.required, Validators.min(1)]);
      if (!occurrences.value) occurrences.setValue(1, {emitEvent: false});
      endDate.disable();
      endDate.setValue(null, {emitEvent: false});
      endDate.clearValidators();
      frequency.disable();
      if (interval) interval.disable();
      frequency.setValue(null);
      if (interval) interval.setValue(null);
      frequency.clearValidators();
      if (interval) interval.clearValidators();
    } else if (condition === 'DATE') {
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
      frequency.disable();
      if (interval) interval.disable();
      frequency.setValue(null);
      if (interval) interval.setValue(null);
      frequency.clearValidators();
      if (interval) interval.clearValidators();
    }

    occurrences.updateValueAndValidity({emitEvent: false});
    endDate.updateValueAndValidity({emitEvent: false});
  }

  private resolveDefaultEndDate(): string {
    const frequency = this.form.controls.frequency.value ?? 'MONTHLY';
    const interval = this.form.controls.interval.value ?? 1;

    return defaultStopDate(todayIsoDate(), frequency, interval);
  }

  private refreshDefaultEndDate(): void {
    if (this.stopCondition() !== 'DATE' || !this.endDateIsDefault) return;

    this.form.controls.endDate.setValue(this.resolveDefaultEndDate(), {emitEvent: false});
  }
}
