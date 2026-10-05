import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  viewChild,
  ElementRef,
} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {FormBuilder, FormControl, ReactiveFormsModule, Validators} from '@angular/forms';
import {
  CATEGORY_APPLY_TYPE_LABEL,
  CATEGORY_COLOR_PALETTE,
  CATEGORY_ICON_OPTIONS,
  DEFAULT_CATEGORY_COLOR,
} from '@core/constants';
import {Category} from '@core/models';
import {CategoryApplyType} from '@core/types';
import {toCategorySlug, toSoftCategoryColor} from '@core/utils';
import {AppIconComponent, ModalComponent} from '@shared/components';

@Component({
  selector: 'app-category-form-modal',
  imports: [ReactiveFormsModule, ModalComponent, AppIconComponent],
  templateUrl: './category-form-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryFormModalComponent {
  readonly isOpen = input(false);
  readonly category = input<Category | null>(null);

  readonly close = output<void>();
  readonly save = output<Omit<Category, 'id'>>();

  private readonly fb = inject(FormBuilder);

  private readonly nameInput = viewChild<ElementRef<HTMLInputElement>>('nameInput');

  protected readonly colorPalette = CATEGORY_COLOR_PALETTE;
  protected readonly iconOptions = CATEGORY_ICON_OPTIONS;
  protected readonly toSoftCategoryColor = toSoftCategoryColor;
  protected readonly applyTypeOptions = Object.entries(CATEGORY_APPLY_TYPE_LABEL) as ReadonlyArray<
    [CategoryApplyType, string]
  >;

  protected readonly form = this.fb.group({
    displayName: this.fb.control<string>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    applyType: this.fb.control<CategoryApplyType>('EXPENSE', {nonNullable: true}),
    color: this.fb.control<string>(DEFAULT_CATEGORY_COLOR, {nonNullable: true}),
    icon: this.fb.control<Category['icon']>('tag', {nonNullable: true}),
  });

  private readonly formValue = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  protected readonly title = computed(() =>
    this.category() ? 'Editar categoría' : 'Nueva categoría',
  );

  protected readonly submitLabel = computed(() =>
    this.category() ? 'Guardar cambios' : 'Crear categoría',
  );

  protected readonly preview = computed<Omit<Category, 'id'>>(() => {
    const value = this.formValue();
    const displayName = value.displayName?.trim() ?? '';

    return {
      name: toCategorySlug(displayName),
      displayName: displayName.length > 0 ? displayName : 'Nueva categoría',
      icon: value.icon ?? 'tag',
      color: value.color || DEFAULT_CATEGORY_COLOR,
      applyType: value.applyType ?? 'EXPENSE',
    };
  });

  constructor() {
    effect(() => {
      this.prepareForm();
    });
  }

  private prepareForm(): void {
    if (!this.isOpen()) return;

    const editing = this.category();

    this.form.reset(
      editing
        ? {
            displayName: editing.displayName,
            applyType: editing.applyType,
            color: editing.color,
            icon: editing.icon,
          }
        : {
            displayName: '',
            applyType: 'EXPENSE',
            color: DEFAULT_CATEGORY_COLOR,
            icon: 'tag',
          },
    );

    window.setTimeout(() => this.nameInput()?.nativeElement.focus({preventScroll: true}), 100);
  }

  protected selectColor(hex: string): void {
    this.form.controls.color.setValue(hex);
  }

  protected selectIcon(icon: Category['icon']): void {
    this.form.controls.icon.setValue(icon);
  }

  protected applyTypeLabel(applyType: CategoryApplyType): string {
    return CATEGORY_APPLY_TYPE_LABEL[applyType];
  }

  protected errorFor(field: FormControl<string>): string | null {
    if (!field.touched || !field.errors) return null;
    if (field.hasError('required')) return 'Este campo es obligatorio.';
    return 'Valor inválido.';
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.save.emit(this.preview());
  }
}
