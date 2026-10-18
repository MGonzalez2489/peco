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
import {FormBuilder, FormControl, ReactiveFormsModule, Validators} from '@angular/forms';
import {ADJUSTMENT_CATEGORY_ID, ACCOUNT_TYPES, ACCOUNT_TYPE_MAP} from '@core/constants';
import {Account, SelectOption} from '@core/models';
import {AccountsStore} from '@core/stores/accounts.store';
import {MovementsStore} from '@core/stores/movements.store';
import {AccountTypeKey} from '@core/types';
import {accountColor} from '@core/utils';
import {AppSelectComponent, ModalComponent} from '@shared/components';
import {CurrencyInputDirective} from '@shared/directives';

const ADJUSTMENT_NOTE = 'Ajuste manual de saldo';

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

  protected readonly accountTypeKeys = AccountTypeKey;

  protected readonly form = this.fb.group({
    name: this.fb.control<string>('', Validators.required),
    type: this.fb.control<AccountTypeKey>(AccountTypeKey.CASH, Validators.required),
    initialBalance: this.fb.control<number | null>(0, {
      validators: [Validators.required, Validators.min(0)],
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
      this.applyTypeValidators(editing.type.key);
      this.form.reset({
        name: editing.name,
        type: editing.type.key,
        initialBalance: editing.currentBalance,
        targetGoal: editing.targetGoal ?? null,
        creditLimit: editing.creditLimit ?? null,
        includeInTotal: editing.includeInTotal ?? true,
        pinToHome: editing.pinToHome ?? false,
        note: editing.note ?? '',
      });
    } else {
      this.applyTypeValidators(AccountTypeKey.CASH);
      this.form.reset({
        name: '',
        type: AccountTypeKey.CASH,
        initialBalance: 0,
        targetGoal: null,
        creditLimit: null,
        includeInTotal: true,
        pinToHome: false,
        note: '',
      });
    }
  }

  private applyTypeValidators(type: AccountTypeKey): void {
    this.applyBalanceValidators(type);
    this.updateAccountTypeValidators(type);
  }

  private applyBalanceValidators(type: AccountTypeKey): void {
    const balance = this.form.controls.initialBalance;
    if (type === AccountTypeKey.CREDIT) {
      balance.setValidators([Validators.required]);
    } else {
      balance.setValidators([Validators.required, Validators.min(0)]);
    }
    balance.updateValueAndValidity();
  }

  private updateAccountTypeValidators(type: AccountTypeKey): void {
    const creditLimit = this.form.controls.creditLimit;
    const targetGoal = this.form.controls.targetGoal;

    if (type === AccountTypeKey.CREDIT) {
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
    const isCredit = raw.type === AccountTypeKey.CREDIT;
    const targetGoal = isCredit ? undefined : (raw.targetGoal ?? undefined);
    const creditLimit = isCredit ? (raw.creditLimit ?? undefined) : undefined;

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
        type: ACCOUNT_TYPE_MAP[raw.type ?? editing.type.key],
        targetGoal,
        creditLimit,
        includeInTotal: raw.includeInTotal ?? true,
        pinToHome: raw.pinToHome ?? false,
        note: raw.note?.trim() || undefined,
      });
    } else {
      this.accountsStore.createAccount({
        name: raw.name?.trim() ?? '',
        initialBalance: raw.initialBalance ?? 0,
        type: ACCOUNT_TYPE_MAP[raw.type ?? AccountTypeKey.CASH],
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
    if (field.hasError('min')) return `El valor mínimo es ${field.getError('min').min}.`;
    return 'Valor inválido.';
  }
}
