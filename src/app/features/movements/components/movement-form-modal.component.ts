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
import {MOVEMENT_TYPE_LABEL} from '@core/constants';
import {FINANCE_STORAGE} from '@core/services/finance-storage.interface';
import {MovementType} from '@core/types';
import {ModalComponent} from '@shared/components';
import {CurrencyInputDirective} from '@shared/directives';

@Component({
  selector: 'app-movement-form-modal',
  imports: [ReactiveFormsModule, ModalComponent, CurrencyInputDirective],
  templateUrl: './movement-form-modal.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MovementFormModalComponent {
  readonly isOpen = input(false);

  readonly closed = output<void>();

  readonly storage = inject(FINANCE_STORAGE);

  readonly accounts = this.storage.accounts;
  readonly categories = this.storage.categories;

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

  readonly availableCategories = computed(() => {
    const type = this.selectedType();
    const all = this.categories();
    switch (type) {
      case 'INCOME':
        return all.filter((c) => c.applyType === 'INCOME' || c.applyType === 'BOTH');
      case 'EXPENSE':
        return all.filter((c) => c.applyType === 'EXPENSE' || c.applyType === 'BOTH');
      case 'TRANSFER':
        return all.filter((c) => c.applyType === 'TRANSFER');
      default:
        return all.filter((c) => c.applyType === 'EXPENSE' || c.applyType === 'BOTH');
    }
  });

  readonly destinationAccounts = computed(() =>
    this.accounts().filter((account) => account.id !== this.sourceAccountId()),
  );

  readonly typeOptions: Array<{value: MovementType; label: string}> = [
    {value: 'INCOME', label: MOVEMENT_TYPE_LABEL.INCOME},
    {value: 'EXPENSE', label: MOVEMENT_TYPE_LABEL.EXPENSE},
    {value: 'TRANSFER', label: MOVEMENT_TYPE_LABEL.TRANSFER},
  ];

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
      if (this.isOpen()) {
        this.form.reset({
          amount: 0,
          type: 'EXPENSE',
          accountId: '',
          categoryId: '',
          targetAccountId: null,
          note: '',
        });
        this.selectedType.set('EXPENSE');
        this.sourceAccountId.set('');
        const first = this.accounts()[0];
        if (first) sourceControl.setValue(first.id);
        this.syncDestination('EXPENSE');
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
        const transferCat = list.find((c) => c.applyType === 'TRANSFER') ?? list[0];
        if (transferCat) categoryControl.setValue(transferCat.id);
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

    const categoryId =
      raw.type === 'TRANSFER'
        ? (this.availableCategories().find((c) => c.applyType === 'TRANSFER')?.id ?? 'transfer')
        : (raw.categoryId ?? '');

    this.storage.registerMovement({
      accountId: raw.accountId ?? '',
      categoryId,
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
