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
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import {ADJUSTMENT_CATEGORY_ID, ACCOUNT_TYPES} from '@core/constants';
import {Account, SelectOption} from '@core/models';
import {AccountsStore} from '@core/stores/accounts.store';
import {MovementsStore} from '@core/stores/movements.store';
import {AccountType} from '@core/types';
import {accountColor, fromCents, toCents} from '@core/utils';
import {AppSelectComponent, ModalComponent} from '@shared/components';
import {CurrencyInputDirective} from '@shared/directives';

const ADJUSTMENT_NOTE = 'Ajuste manual de saldo';

/** Rejects a negative value; only applied to account types that cannot be in debt. */
const negativeBalanceForbidden = (control: AbstractControl): ValidationErrors | null =>
  typeof control.value === 'number' && control.value < 0 ? {negativeBalance: true} : null;

@Component({
  selector: 'app-account-form-modal',
  imports: [ReactiveFormsModule, ModalComponent, AppSelectComponent, CurrencyInputDirective],
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

  protected readonly accountTypeOptions: SelectOption[] = ACCOUNT_TYPES.map((type) => ({
    value: type.key,
    label: type.name,
    icon: type.icon,
    color: accountColor(type.color).chip,
  }));

  protected readonly form = this.fb.group({
    name: this.fb.control<string>('', Validators.required),
    type: this.fb.control<AccountType>('CASH', Validators.required),
    initialBalance: this.fb.control<number | null>(0, {
      validators: [Validators.required, negativeBalanceForbidden],
    }),
    targetGoal: this.fb.control<number | null>(null, Validators.min(0)),
    creditLimit: this.fb.control<number | null>(null),
    includeInTotal: this.fb.control<boolean>(true),
    pinToHome: this.fb.control<boolean>(false),
    note: this.fb.control<string>(''),
  });

  constructor() {
    effect(() => {
      this.prepareForm();
    });
    effect(() => {
      if (!this.isOpen()) return;
      this.focusNameField();
    });
    this.form.controls.type.valueChanges.pipe(takeUntilDestroyed()).subscribe((type) => {
      if (type) this.applyTypeValidators(type);
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

    if (editing) {
      this.applyTypeValidators(editing.type);
      this.form.reset({
        name: editing.name,
        type: editing.type,
        initialBalance: fromCents(editing.currentBalance),
        targetGoal: editing.targetGoal != null ? fromCents(editing.targetGoal) : null,
        creditLimit: editing.creditLimit != null ? fromCents(editing.creditLimit) : null,
        includeInTotal: editing.includeInTotal ?? true,
        pinToHome: editing.pinToHome ?? false,
        note: editing.note ?? '',
      });
    } else {
      this.applyTypeValidators('CASH');
      this.form.reset({
        name: '',
        type: 'CASH',
        initialBalance: 0,
        targetGoal: null,
        creditLimit: null,
        includeInTotal: true,
        pinToHome: false,
        note: '',
      });
    }
  }

  private applyTypeValidators(type: AccountType): void {
    this.applyBalanceValidators(type);
    this.updateAccountTypeValidators(type);
  }

  private applyBalanceValidators(type: AccountType): void {
    const balance = this.form.controls.initialBalance;
    if (type === 'CREDIT') {
      balance.setValidators([Validators.required]);
    } else {
      balance.setValidators([Validators.required, negativeBalanceForbidden]);
    }
    balance.updateValueAndValidity();
  }

  private updateAccountTypeValidators(type: AccountType): void {
    const creditLimit = this.form.controls.creditLimit;
    const targetGoal = this.form.controls.targetGoal;

    if (type === 'CREDIT') {
      targetGoal.setValue(null);
      targetGoal.clearValidators();

      creditLimit.setValidators([Validators.required, Validators.min(0.01)]);
    } else {
      creditLimit.setValue(null);
      creditLimit.clearValidators();

      targetGoal.setValidators([Validators.min(0)]);
    }

    creditLimit.updateValueAndValidity();
    targetGoal.updateValueAndValidity();
  }

  onAmountInputFocus(event: FocusEvent): void {
    (event.target as HTMLInputElement).select();
  }

  onAmountInputBlur(): void {
    if (this.form.controls.initialBalance.value === null) {
      this.form.controls.initialBalance.setValue(0);
    }
  }

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const raw = this.form.getRawValue();
    const editing = this.account();
    const isCredit = raw.type === 'CREDIT';
    const targetGoal = isCredit || raw.targetGoal == null ? undefined : toCents(raw.targetGoal);
    const creditLimit = !isCredit || raw.creditLimit == null ? undefined : toCents(raw.creditLimit);
    // The form works in decimal dollars; the store and models persist cents.
    const newBalanceInCents = toCents(raw.initialBalance ?? 0);

    if (editing) {
      const delta = newBalanceInCents - editing.currentBalance;

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
        currentBalance: newBalanceInCents,
        type: raw.type ?? editing.type,
        targetGoal,
        creditLimit,
        includeInTotal: raw.includeInTotal ?? true,
        pinToHome: raw.pinToHome ?? false,
        note: raw.note?.trim() || undefined,
      });
    } else {
      this.accountsStore.createAccount({
        name: raw.name?.trim() ?? '',
        initialBalance: newBalanceInCents,
        type: raw.type ?? 'CASH',
        targetGoal,
        creditLimit,
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
    if (field.hasError('negativeBalance')) {
      return 'Solo las tarjetas de crédito pueden registrar un saldo inicial negativo';
    }
    if (field.hasError('min')) return `El valor mínimo es ${field.getError('min').min}.`;
    return 'Valor inválido.';
  }
}
