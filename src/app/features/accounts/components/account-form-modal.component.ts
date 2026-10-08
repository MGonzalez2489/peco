import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import {FormBuilder, FormControl, ReactiveFormsModule, Validators} from '@angular/forms';
import {
  ADJUSTMENT_CATEGORY_ID,
  COLOR_PALETTE,
  ACCOUNT_COLORS,
  DEFAULT_ACCOUNT_COLOR,
} from '@core/constants';
import {Account} from '@core/models';
import {AccountsStore} from '@core/stores/accounts.store';
import {MovementsStore} from '@core/stores/movements.store';
import {AccountColor} from '@core/types';
import {ModalComponent} from '@shared/components';
import {CurrencyInputDirective} from '@shared/directives';
import {AppIconComponent} from '@shared/components/app-icon/app-icon.component';

const ADJUSTMENT_NOTE = 'Ajuste manual de saldo';

@Component({
  selector: 'app-account-form-modal',
  imports: [ReactiveFormsModule, ModalComponent, CurrencyInputDirective, AppIconComponent],
  templateUrl: './account-form-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountFormModalComponent {
  readonly isOpen = input(false);
  readonly account = input<Account | null>(null);

  readonly closed = output<void>();
  readonly saved = output<void>();

  readonly accountsStore = inject(AccountsStore);
  readonly movementsStore = inject(MovementsStore);

  private readonly fb = inject(FormBuilder);

  private readonly nameInput = viewChild<ElementRef<HTMLInputElement>>('nameInput');

  protected readonly form = this.fb.group({
    name: this.fb.control<string>('', Validators.required),
    initialBalance: this.fb.control<number | null>(0, {
      validators: [Validators.required, Validators.min(0)],
    }),
    targetGoal: this.fb.control<number | null>(null, Validators.min(0)),
    color: this.fb.control<string>(DEFAULT_ACCOUNT_COLOR),
    includeInTotal: this.fb.control<boolean>(true),
    pinToHome: this.fb.control<boolean>(false),
    note: this.fb.control<string>(''),
  });

  readonly colorPalette = COLOR_PALETTE;

  constructor() {
    effect(() => {
      this.prepareForm();
    });
    effect(() => {
      if (!this.isOpen()) return;
      this.focusNameField();
    });
  }

  private focusNameField(): void {
    // The shared modal focuses its panel via requestAnimationFrame on open,
    // and the input only exists once the modal @if block renders. A short
    // delay ensures the input is in the DOM and receives focus last, so it
    // never blurs immediately (which would mark the control touched and show
    // a premature required-field error).
    window.setTimeout(() => {
      this.nameInput()?.nativeElement.focus({preventScroll: true});
    }, 100);
  }

  private prepareForm(): void {
    const editing = this.account();
    if (!this.isOpen()) return;

    const balance = this.form.controls.initialBalance;

    if (editing) {
      balance.setValidators([Validators.required]);
      balance.updateValueAndValidity();
      this.form.reset({
        name: editing.name,
        initialBalance: editing.currentBalance,
        targetGoal: editing.targetGoal ?? null,
        color: this.resolveColor(editing.color),
        includeInTotal: editing.includeInTotal ?? true,
        pinToHome: editing.pinToHome ?? false,
        note: editing.note ?? '',
      });
    } else {
      balance.setValidators([Validators.required, Validators.min(0)]);
      balance.updateValueAndValidity();
      this.form.reset({
        name: '',
        initialBalance: 0,
        targetGoal: null,
        color: DEFAULT_ACCOUNT_COLOR,
        includeInTotal: true,
        pinToHome: false,
        note: '',
      });
    }
  }

  onAmountInputFocus(event: FocusEvent): void {
    (event.target as HTMLInputElement).select();
  }

  onAmountInputBlur(): void {
    if (this.form.controls.initialBalance.value === null) {
      this.form.controls.initialBalance.setValue(0);
    }
  }

  private resolveColor(color?: string): string {
    if (!color) return DEFAULT_ACCOUNT_COLOR;
    if (color.startsWith('#')) return color;
    return ACCOUNT_COLORS[color as AccountColor]?.chip ?? DEFAULT_ACCOUNT_COLOR;
  }

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const raw = this.form.getRawValue();
    const editing = this.account();

    if (editing) {
      const newBalance = raw.initialBalance ?? 0;
      const delta = Math.round((newBalance - editing.currentBalance) * 100) / 100;

      if (delta !== 0) {
        this.movementsStore.registerMovement({
          accountId: editing.id,
          categoryId: ADJUSTMENT_CATEGORY_ID,
          type: delta > 0 ? 'INCOME' : 'EXPENSE',
          amount: Math.abs(delta),
          note: ADJUSTMENT_NOTE,
        });
      }

      this.accountsStore.updateAccount(editing.id, {
        name: raw.name?.trim() ?? '',
        currentBalance: newBalance,
        targetGoal: raw.targetGoal ?? undefined,
        color: raw.color || DEFAULT_ACCOUNT_COLOR,
        includeInTotal: raw.includeInTotal ?? true,
        pinToHome: raw.pinToHome ?? false,
        note: raw.note?.trim() || undefined,
      });
    } else {
      this.accountsStore.createAccount({
        name: raw.name?.trim() ?? '',
        initialBalance: raw.initialBalance ?? 0,
        targetGoal: raw.targetGoal ?? undefined,
        color: raw.color || DEFAULT_ACCOUNT_COLOR,
        includeInTotal: raw.includeInTotal ?? true,
        pinToHome: raw.pinToHome ?? false,
        note: raw.note?.trim() || undefined,
      });
    }

    this.saved.emit();
    this.closed.emit();
  }

  errorFor<T>(field: FormControl<T>): string | null {
    if (!field.touched || !field.errors) return null;
    if (field.hasError('required')) return 'Este campo es obligatorio.';
    if (field.hasError('min')) return `El valor mínimo es ${field.getError('min').min}.`;
    return 'Valor inválido.';
  }
}
