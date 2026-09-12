import {Component, computed, effect, inject, input, output, signal} from '@angular/core';
import {FormBuilder, FormControl, ReactiveFormsModule, Validators} from '@angular/forms';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {ModalComponent} from '../../../shared/components/modal/modal.component';
import {FINANCE_STORAGE} from '../../../core/services/finance-storage.interface';
import {MovementType, MOVEMENT_TYPE_LABEL} from '../../../core/models/finance.model';

@Component({
  selector: 'app-movement-form-modal',
  imports: [ReactiveFormsModule, ModalComponent],
  templateUrl: './movement-form-modal.component.html',
})
export class MovementFormModalComponent {
  readonly isOpen = input(false);

  readonly closed = output<void>();

  readonly storage = inject(FINANCE_STORAGE);

  readonly categories = this.storage.categories;

  private readonly fb = inject(FormBuilder);

  protected readonly form = this.fb.group({
    amount: this.fb.control<number | null>(null, {
      validators: [Validators.required, Validators.min(0.01)],
    }),
    type: this.fb.control<MovementType>('EXPENSE', Validators.required),
    categoryId: this.fb.control<string>('', Validators.required),
    destinationCategoryId: this.fb.control<string | null>(null),
    note: this.fb.control<string>(''),
  });

  readonly selectedType = signal<MovementType>('EXPENSE');
  readonly sourceCategoryId = signal('');

  readonly destinationCategories = computed(() =>
    this.categories().filter((category) => category.id !== this.sourceCategoryId()),
  );

  readonly typeOptions: Array<{value: MovementType; label: string}> = [
    {value: 'INCOME', label: MOVEMENT_TYPE_LABEL.INCOME},
    {value: 'EXPENSE', label: MOVEMENT_TYPE_LABEL.EXPENSE},
    {value: 'TRANSFER', label: MOVEMENT_TYPE_LABEL.TRANSFER},
  ];

  constructor() {
    const typeControl = this.form.controls.type;
    const sourceControl = this.form.controls.categoryId;
    const destinationControl = this.form.controls.destinationCategoryId;

    typeControl.valueChanges.pipe(takeUntilDestroyed()).subscribe((type) => {
      const value = type ?? 'EXPENSE';
      this.selectedType.set(value);
      this.syncDestination(value);
    });

    sourceControl.valueChanges.pipe(takeUntilDestroyed()).subscribe((source) => {
      this.sourceCategoryId.set(source ?? '');
      if (typeControl.value === 'TRANSFER' && source && destinationControl.value === source) {
        destinationControl.setValue(this.categories().find((c) => c.id !== source)?.id ?? '');
      }
    });

    effect(() => {
      if (this.isOpen()) {
        this.form.reset({
          amount: null,
          type: 'EXPENSE',
          categoryId: '',
          destinationCategoryId: null,
          note: '',
        });
        this.selectedType.set('EXPENSE');
        this.sourceCategoryId.set('');
        const first = this.categories()[0];
        if (first) sourceControl.setValue(first.id);
        this.syncDestination('EXPENSE');
      }
    });

    effect(() => {
      const available = this.categories();
      const current = sourceControl.value;
      if (current && available.some((c) => c.id === current)) return;
      const first = available[0];
      if (first) sourceControl.setValue(first.id);
    });
  }

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const raw = this.form.getRawValue();
    const destinationId = raw.type === 'TRANSFER' ? (raw.destinationCategoryId ?? null) : undefined;
    if (raw.type === 'TRANSFER' && (!destinationId || destinationId === raw.categoryId)) return;

    this.storage.registerMovement({
      categoryId: raw.categoryId ?? '',
      type: raw.type ?? 'EXPENSE',
      amount: raw.amount ?? 0,
      note: raw.note?.trim() || undefined,
      destinationCategoryId: destinationId ?? undefined,
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
    const destination = this.form.controls.destinationCategoryId;
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
