import {ComponentFixture, TestBed} from '@angular/core/testing';
import {FormGroup} from '@angular/forms';
import {ADJUSTMENT_CATEGORY_ID} from '@core/constants';
import {ACCOUNT_TYPE_MAP} from '@core/constants/account-type-map.constant';
import {provideAppIcons} from '@core/icons/app-icons.provider';
import {Account} from '@core/models';
import {AccountsStore} from '@core/stores/accounts.store';
import {MovementsStore} from '@core/stores/movements.store';
import {AccountTypeKey} from '@core/types';
import {AccountFormModalComponent} from './account-form-modal.component';

describe('AccountFormModalComponent', () => {
  let fixture: ComponentFixture<AccountFormModalComponent>;
  let accountsStore: InstanceType<typeof AccountsStore>;
  let movementsStore: InstanceType<typeof MovementsStore>;

  const native = (): HTMLElement => fixture.nativeElement as HTMLElement;

  const open = async (account: Account | null = null): Promise<void> => {
    fixture.componentRef.setInput('account', account);
    fixture.componentRef.setInput('isOpen', true);
    TestBed.flushEffects();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const setText = (selector: string, value: string): void => {
    const input = native().querySelector<HTMLInputElement>(selector);
    if (!input) throw new Error(`${selector} must be rendered`);

    input.value = value;
    input.dispatchEvent(new Event('input', {bubbles: true}));
    fixture.detectChanges();
  };

  const selectType = (value: AccountTypeKey): void => {
    const trigger = native().querySelector<HTMLButtonElement>('#cat-type');
    if (!trigger) throw new Error('type select must be rendered');

    trigger.click();
    fixture.detectChanges();

    const expectedLabel = ACCOUNT_TYPE_MAP[value].name;
    const options = Array.from(native().querySelectorAll<HTMLLIElement>('[role="option"]'));
    const option = options.find((item) => item.textContent?.includes(expectedLabel));
    if (!option) throw new Error(`type option "${expectedLabel}" must be rendered`);

    option.click();
    fixture.detectChanges();
  };

  const submit = (): void => {
    const button = native().querySelector<HTMLButtonElement>('button[type="submit"]');
    if (!button) throw new Error('submit button must be rendered');

    button.click();
    fixture.detectChanges();
  };

  const seedAccount = (balance: number): Account => {
    const created = accountsStore.createAccount({
      name: 'Ahorro',
      initialBalance: balance,
      type: ACCOUNT_TYPE_MAP[AccountTypeKey.SAVINGS],
      includeInTotal: true,
    });
    if (!created) throw new Error('account must be created');
    return created;
  };

  const accountById = (id: string): Account | undefined =>
    accountsStore.accounts().find((account) => account.id === id);

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [AccountFormModalComponent],
      providers: [provideAppIcons()],
    });

    accountsStore = TestBed.inject(AccountsStore);
    movementsStore = TestBed.inject(MovementsStore);
    fixture = TestBed.createComponent(AccountFormModalComponent);
    fixture.detectChanges();
  });

  it('creates a credit account with a negative initial balance', async () => {
    await open();
    setText('#cat-name', 'Tarjeta de crédito');
    selectType(AccountTypeKey.CREDIT);
    setText('#cat-balance', '-1500');
    setText('#cat-credit-limit', '15000');
    submit();

    const created = accountsStore
      .accounts()
      .find((account) => account.name === 'Tarjeta de crédito');
    expect(created?.type.key).toBe(AccountTypeKey.CREDIT);
    expect(created?.currentBalance).toBe(-1500);
    expect(created?.creditLimit).toBe(15000);
    expect(created?.targetGoal).toBeUndefined();
  });

  it('requires a credit limit and hides the savings goal for credit accounts', async () => {
    await open();
    setText('#cat-name', 'Tarjeta de crédito');
    selectType(AccountTypeKey.CREDIT);
    setText('#cat-balance', '-1500');

    expect(native().querySelector('#cat-credit-limit')).not.toBeNull();
    expect(native().querySelector('#cat-goal')).toBeNull();

    submit();

    expect(
      accountsStore.accounts().some((account) => account.name === 'Tarjeta de crédito'),
    ).toBe(false);
    expect(native().querySelector('#cat-credit-limit')?.classList).toContain('border-rose-400');
  });

  it('shows the savings goal and clears the credit limit for non-credit accounts', async () => {
    await open();
    setText('#cat-name', 'Cuenta de ahorro');
    selectType(AccountTypeKey.SAVINGS);
    setText('#cat-balance', '500');
    setText('#cat-goal', '2000');

    expect(native().querySelector('#cat-credit-limit')).toBeNull();
    expect(native().querySelector('#cat-goal')).not.toBeNull();

    submit();

    const created = accountsStore
      .accounts()
      .find((account) => account.name === 'Cuenta de ahorro');
    expect(created?.targetGoal).toBe(2000);
    expect(created?.creditLimit).toBeUndefined();
  });

  it('populates the credit limit when editing a credit account', async () => {
    const created = accountsStore.createAccount({
      name: 'Tarjeta de crédito',
      initialBalance: -500,
      type: ACCOUNT_TYPE_MAP[AccountTypeKey.CREDIT],
      creditLimit: 12000,
      includeInTotal: true,
    });
    if (!created) throw new Error('account must be created');

    await open(created);

    const input = native().querySelector<HTMLInputElement>('#cat-credit-limit');
    expect(input?.value).toContain('12,000.00');

    const form = (fixture.componentInstance as unknown as {form: FormGroup}).form;
    expect(form.controls['creditLimit'].value).toBe(12000);
  });

  it('sanitizes negative input for non-credit accounts', async () => {
    await open();
    setText('#cat-name', 'Cuenta de débito');
    selectType(AccountTypeKey.DEBIT);
    setText('#cat-balance', '-100');

    const form = (fixture.componentInstance as unknown as {form: FormGroup}).form;
    expect(form.controls['initialBalance'].value).toBe(100);
  });

  it('rejects a negative balance for non-credit accounts', async () => {
    await open();
    setText('#cat-name', 'Cuenta de débito');
    selectType(AccountTypeKey.DEBIT);

    const form = (fixture.componentInstance as unknown as {form: FormGroup}).form;
    form.controls['initialBalance'].setValue(-100);
    form.controls['initialBalance'].markAsTouched();
    fixture.detectChanges();

    expect(form.controls['initialBalance'].hasError('min')).toBe(true);

    submit();

    expect(accountsStore.accounts().some((account) => account.name === 'Cuenta de débito')).toBe(
      false,
    );
  });

  it('selects the whole amount when the balance input receives focus', async () => {
    await open();

    const input = native().querySelector<HTMLInputElement>('#cat-balance');
    if (!input) throw new Error('balance input must be rendered');

    input.dispatchEvent(new FocusEvent('focus', {bubbles: true}));

    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(input.value.length);
  });

  it('defaults an empty amount back to 0 on blur', async () => {
    await open();

    const input = native().querySelector<HTMLInputElement>('#cat-balance');
    const nameInput = native().querySelector<HTMLInputElement>('#cat-name');
    if (!input || !nameInput) throw new Error('balance and name inputs must be rendered');

    setText('#cat-balance', '');
    input.focus();
    nameInput.focus();

    expect(input.value).toBe('0.00');
  });

  it('registers an income adjustment when the balance increases', async () => {
    const account = seedAccount(1000);
    await open(account);
    setText('#cat-balance', '1500');
    submit();

    expect(accountById(account.id)?.currentBalance).toBe(1500);
    expect(movementsStore.movements().length).toBe(1);
    expect(movementsStore.movements()[0]).toMatchObject({
      accountId: account.id,
      categoryId: ADJUSTMENT_CATEGORY_ID,
      type: 'INCOME',
      amount: 500,
      note: 'Ajuste manual de saldo',
    });
  });

  it('registers an expense adjustment when the balance decreases', async () => {
    const account = seedAccount(1500);
    await open(account);
    setText('#cat-balance', '1200');
    submit();

    expect(accountById(account.id)?.currentBalance).toBe(1200);
    expect(movementsStore.movements().length).toBe(1);
    expect(movementsStore.movements()[0]).toMatchObject({
      accountId: account.id,
      categoryId: ADJUSTMENT_CATEGORY_ID,
      type: 'EXPENSE',
      amount: 300,
    });
  });

  it('updates metadata without registering a movement when the balance is unchanged', async () => {
    const account = seedAccount(1000);
    await open(account);
    setText('#cat-balance', '1000');
    setText('#cat-name', 'Vacaciones');
    submit();

    expect(accountById(account.id)?.name).toBe('Vacaciones');
    expect(movementsStore.movements().length).toBe(0);
  });

  it('creates an account excluded from the available balance when toggled off', async () => {
    await open();
    setText('#cat-name', 'Fondo de emergencia');
    setText('#cat-balance', '100');

    const switches = native().querySelectorAll<HTMLButtonElement>('button[role="switch"]');
    const includeSwitch = Array.from(switches).find((button) =>
      button.textContent?.includes('Incluir en el saldo disponible'),
    );
    if (!includeSwitch) throw new Error('include in total switch must be rendered');

    expect(includeSwitch.getAttribute('aria-checked')).toBe('true');
    includeSwitch.click();
    fixture.detectChanges();
    expect(includeSwitch.getAttribute('aria-checked')).toBe('false');

    submit();

    const created = accountsStore
      .accounts()
      .find((account) => account.name === 'Fondo de emergencia');
    expect(created?.includeInTotal).toBe(false);
    expect(accountsStore.totalBalance()).toBe(100);
    expect(accountsStore.availableBalance()).toBe(0);
  });
});
