import {ComponentFixture, TestBed} from '@angular/core/testing';
import {ADJUSTMENT_CATEGORY_ID} from '@core/constants';
import {provideAppIcons} from '@core/icons/app-icons.provider';
import {Account} from '@core/models';
import {AccountsStore} from '@core/stores/accounts.store';
import {MovementsStore} from '@core/stores/movements.store';
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
