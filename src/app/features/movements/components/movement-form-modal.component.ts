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
  MOVEMENT_TYPE_LABEL,
  RECURRENCE_FREQUENCY_LABEL,
  SCHEDULED_TRANSACTION_STOP_CONDITION_LABEL,
} from '@core/constants';
import {Account, Category, SelectOption} from '@core/models';
import {AccountsStore} from '@core/stores/accounts.store';
import {CatalogStore} from '@core/stores/catalog.store';
import {MovementsStore} from '@core/stores/movements.store';
import {ScheduledTransactionsStore} from '@core/stores/scheduled-transactions.store';
import {MovementType, RecurrenceFrequency, ScheduledTransactionStopCondition} from '@core/types';
import {accountColor, toIconName, todayIsoDate} from '@core/utils';
import {AppIconComponent, AppSelectComponent, ModalComponent} from '@shared/components';
import {CurrencyInputDirective, DateInputDirective} from '@shared/directives';

interface MovementFormValue {
  amount: number | null;
  type: MovementType | null;
  accountId: string | null;
  categoryId: string | null;
  targetAccountId: string | null;
  note: string | null;
  isRecurring: boolean | null;
  frequency: RecurrenceFrequency | null;
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
    DateInputDirective,
    AppSelectComponent,
    AppIconComponent,
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

  readonly typeOptions: Array<{value: MovementType; label: string}> = [
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
    return 'Valor inválido.';
  }

  private saveRecurring(raw: MovementFormValue, destinationId: string | undefined): void {
    const condition = raw.stopCondition ?? 'NEVER';
    const name = raw.note?.trim() || this.categoryDisplayName(raw.categoryId ?? '');

    this.scheduledStore.createScheduledTransaction({
      name,
      estimatedAmount: raw.amount ?? 0,
      type: raw.type ?? 'EXPENSE',
      categoryId: raw.categoryId ?? '',
      sourceAccountId: raw.accountId ?? '',
      destinationAccountId: destinationId,
      frequency: raw.frequency ?? 'MONTHLY',
      nextExecutionDate: todayIsoDate(),
      autoApply: raw.autoApply ?? false,
      active: true,
      totalOccurrences:
        condition === 'OCCURRENCES' ? (raw.totalOccurrences ?? undefined) : undefined,
      endDate: condition === 'DATE' ? (raw.endDate ?? undefined) : undefined,
    });
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

  private toAccountOption(account: Account): SelectOption {
    return {
      value: account.id,
      label: account.name,
      icon: toIconName(account.icon, 'wallet'),
      color: accountColor(account.color).chip,
    };
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
