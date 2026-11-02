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
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {FormBuilder, FormControl, ReactiveFormsModule, Validators} from '@angular/forms';
import {MOVEMENT_TYPE_THEME, MOVEMENT_TYPES} from '@core/constants';
import {Category, Movement, SelectOption} from '@core/models';
import {AccountsStore} from '@core/stores/accounts.store';
import {CatalogStore} from '@core/stores/catalog.store';
import {MovementsStore} from '@core/stores/movements.store';
import {MovementType} from '@core/types';
import {fromCents, toAccountOption, toCategoryOption, toCents} from '@core/utils';
import {AppSelectComponent, ModalComponent} from '@shared/components';
import {CurrencyInputDirective} from '@shared/directives';

const TYPE_BUTTON_BASE_CLASS =
  'flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-slate-900';

const TYPE_BUTTON_INACTIVE_CLASS =
  'text-slate-700 enabled:hover:bg-slate-200 dark:text-slate-300 dark:enabled:hover:bg-slate-700';

const AMOUNT_INPUT_BASE_CLASS =
  'w-full rounded-2xl border-1 bg-white py-3 pr-4 pl-8 text-sm text-slate-900 shadow-sm outline-none transition-colors placeholder:text-slate-500 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-400';

@Component({
  selector: 'app-movement-form-modal',
  imports: [ReactiveFormsModule, ModalComponent, CurrencyInputDirective, AppSelectComponent],
  templateUrl: './movement-form-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MovementFormModalComponent {
  readonly isOpen = input(false);
  readonly presetType = input<MovementType>('EXPENSE');
  /** When present the modal edits this movement instead of creating a new one. */
  readonly editMovement = input<Movement | null>(null);

  readonly closed = output<void>();

  readonly accountsStore = inject(AccountsStore);
  readonly catalogStore = inject(CatalogStore);
  readonly movementsStore = inject(MovementsStore);

  readonly accounts = this.accountsStore.accounts;

  readonly isEditMode = computed(() => this.editMovement() !== null);

  readonly saveError = signal<string | null>(null);

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
  });

  readonly selectedType = signal<MovementType>('EXPENSE');
  readonly sourceAccountId = signal('');

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

  readonly movementTypeOptions = MOVEMENT_TYPES.map((type) => ({
    key: type.key,
    name: type.name,
  }));

  private readonly selectedTheme = computed(() => MOVEMENT_TYPE_THEME[this.selectedType()]);

  readonly amountInputClass = computed(() => {
    const theme = this.selectedTheme();
    return [
      AMOUNT_INPUT_BASE_CLASS,
      theme.inputTextClass,
      theme.inputBorderClass,
      theme.inputFocusClass,
    ].join(' ');
  });

  readonly amountSymbolClass = computed(
    () =>
      `pointer-events-none absolute left-4 select-none text-sm font-semibold transition-colors ${this.selectedTheme().inputTextClass}`,
  );

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

    effect(() => {
      if (!this.isOpen()) return;

      this.saveError.set(null);
      const editing = this.editMovement();

      if (editing) {
        this.form.reset({
          amount: fromCents(editing.amount),
          type: editing.type,
          accountId: editing.accountId,
          categoryId: editing.categoryId,
          targetAccountId: editing.targetAccountId ?? null,
          note: editing.note ?? '',
        });
        this.selectedType.set(editing.type);
        this.sourceAccountId.set(editing.accountId);
        typeControl.disable();
        this.syncDestination(editing.type);
        return;
      }

      const preset = this.presetType();
      typeControl.enable();
      this.form.reset({
        amount: 0,
        type: preset,
        accountId: '',
        categoryId: '',
        targetAccountId: null,
        note: '',
      });
      this.selectedType.set(preset);
      this.sourceAccountId.set('');
      const first = this.accounts()[0];
      if (first) sourceControl.setValue(first.id);
      this.syncDestination(preset);
    });

    effect(() => {
      const available = this.accounts();
      const current = sourceControl.value;
      if (current && available.some((account) => account.id === current)) return;
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
    const editing = this.editMovement();

    if (editing) {
      const destinationId = editing.type === 'TRANSFER' ? (raw.targetAccountId ?? null) : undefined;
      if (editing.type === 'TRANSFER' && (!destinationId || destinationId === raw.accountId)) {
        this.saveError.set('Selecciona una cuenta destino válida.');
        return;
      }

      const updated = this.movementsStore.editMovement(editing.id, {
        accountId: raw.accountId ?? '',
        categoryId: raw.categoryId ?? '',
        // The input works in decimal dollars; movements persist integer cents.
        amount: toCents(raw.amount ?? 0),
        note: raw.note?.trim() || undefined,
        targetAccountId: destinationId ?? undefined,
      });

      if (!updated) {
        this.saveError.set(
          this.movementsStore.error() ?? 'No se pudo editar el movimiento. Inténtalo de nuevo.',
        );
        return;
      }

      this.closed.emit();
      return;
    }

    const destinationId = raw.type === 'TRANSFER' ? (raw.targetAccountId ?? null) : undefined;
    if (raw.type === 'TRANSFER' && (!destinationId || destinationId === raw.accountId)) return;

    this.movementsStore.registerMovement({
      accountId: raw.accountId ?? '',
      categoryId: raw.categoryId ?? '',
      type: raw.type ?? 'EXPENSE',
      // The input works in decimal dollars; movements persist integer cents.
      amount: toCents(raw.amount ?? 0),
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

  /** Segmented control classes: the active segment carries the movement type color. */
  typeButtonClass(type: MovementType): string {
    const theme = MOVEMENT_TYPE_THEME[type];
    const state =
      this.selectedType() === type ? theme.activeButtonClass : TYPE_BUTTON_INACTIVE_CLASS;
    return `${TYPE_BUTTON_BASE_CLASS} ${theme.focusRingClass} ${state}`;
  }

  /**
   * Movement types are immutable after creation: the segmented control is disabled
   * while editing so balances and categories cannot drift from the original record.
   */
  setMovementType(type: MovementType): void {
    if (this.isEditMode()) return;
    this.form.controls.type.setValue(type);
    this.form.controls.type.markAsTouched();
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
}
