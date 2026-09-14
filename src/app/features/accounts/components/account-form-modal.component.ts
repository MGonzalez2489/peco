import {ChangeDetectionStrategy, Component, effect, inject, input, output} from '@angular/core';
import {FormBuilder, FormControl, ReactiveFormsModule, Validators} from '@angular/forms';
import {ACCOUNT_COLORS} from '@core/constants';
import {Account} from '@core/models';
import {FINANCE_STORAGE} from '@core/services/finance-storage.interface';
import {AccountColor} from '@core/types';
import {formatCurrency} from '@core/utils';
import {ModalComponent} from '@shared/components';
import {CurrencyInputDirective} from '@shared/directives';

@Component({
  selector: 'app-account-form-modal',
  imports: [ReactiveFormsModule, ModalComponent, CurrencyInputDirective],
  templateUrl: './account-form-modal.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountFormModalComponent {
  readonly isOpen = input(false);
  readonly account = input<Account | null>(null);

  readonly closed = output<void>();
  readonly saved = output<void>();

  readonly storage = inject(FINANCE_STORAGE);

  private readonly fb = inject(FormBuilder);

  protected readonly form = this.fb.group({
    name: this.fb.control<string>('', Validators.required),
    initialBalance: this.fb.control<number | null>(null, {
      validators: [Validators.required, Validators.min(0)],
    }),
    targetGoal: this.fb.control<number | null>(null, Validators.min(0)),
    color: this.fb.control<AccountColor>('indigo'),
    pinToHome: this.fb.control<boolean>(false),
  });

  readonly colorOptions: Array<{key: AccountColor; classes: string}> = Object.entries(
    ACCOUNT_COLORS,
  ).map(([key, palette]) => ({key: key as AccountColor, classes: palette.chip}));

  readonly formatCurrency = formatCurrency;

  constructor() {
    effect(() => {
      this.prepareForm();
    });
  }

  private prepareForm(): void {
    const editing = this.account();
    if (!this.isOpen()) return;

    const balance = this.form.controls.initialBalance;

    if (editing) {
      balance.clearValidators();
      balance.updateValueAndValidity();
      this.form.reset({
        name: editing.name,
        initialBalance: null,
        targetGoal: editing.targetGoal ?? null,
        color: (editing.color as AccountColor) ?? 'indigo',
        pinToHome: editing.pinToHome ?? false,
      });
    } else {
      balance.setValidators([Validators.required, Validators.min(0)]);
      balance.updateValueAndValidity();
      this.form.reset({
        name: '',
        initialBalance: null,
        targetGoal: null,
        color: 'indigo',
        pinToHome: false,
      });
    }
  }

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const raw = this.form.getRawValue();
    const editing = this.account();

    if (editing) {
      this.storage.updateAccount(editing.id, {
        name: raw.name?.trim() ?? '',
        initialBalance: editing.currentBalance,
        targetGoal: raw.targetGoal ?? undefined,
        color: raw.color ?? 'indigo',
        pinToHome: raw.pinToHome ?? false,
      });
    } else {
      this.storage.addAccount({
        name: raw.name?.trim() ?? '',
        initialBalance: raw.initialBalance ?? 0,
        targetGoal: raw.targetGoal ?? undefined,
        color: raw.color ?? 'indigo',
        pinToHome: raw.pinToHome ?? false,
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
