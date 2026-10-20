import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {provideAppIcons} from '@core/icons/app-icons.provider';
import {AccountsStore} from '@core/stores/accounts.store';
import {AccountsComponent} from './accounts.component';

describe('AccountsComponent', () => {
  let fixture: ComponentFixture<AccountsComponent>;
  let accountsStore: InstanceType<typeof AccountsStore>;

  const native = (): HTMLElement => fixture.nativeElement as HTMLElement;

  const rows = (): HTMLElement[] =>
    Array.from(native().querySelectorAll<HTMLElement>('[data-testid="account-row"]'));

  const createButton = (): HTMLButtonElement => {
    const button = Array.from(native().querySelectorAll<HTMLButtonElement>('button')).find(
      (item) => item.textContent?.trim() === 'Crear',
    );
    if (!button) throw new Error('create button must be rendered');
    return button;
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [AccountsComponent],
      providers: [provideAppIcons(), provideRouter([])],
    });

    accountsStore = TestBed.inject(AccountsStore);
    accountsStore.createAccount({
      name: 'Tarjeta Oro',
      initialBalance: -1200,
      type: 'CREDIT',
      creditLimit: 5000,
    });
    accountsStore.createAccount({name: 'Ahorro viaje', initialBalance: 800, type: 'SAVINGS'});
    accountsStore.createAccount({name: 'Ahorro emergencia', initialBalance: 200, type: 'SAVINGS'});

    fixture = TestBed.createComponent(AccountsComponent);
    fixture.detectChanges();
  });

  it('renders every account inside the unified grouped list', () => {
    expect(rows().length).toBe(accountsStore.accounts().length);

    const content = native().textContent ?? '';
    expect(content).toContain('Tarjeta Oro');
    expect(content).toContain('Ahorro viaje');
    expect(content).toContain('Ahorro emergencia');
  });

  it('opens the edit modal when an account row is clicked', () => {
    const target = accountsStore.accounts().find((account) => account.name === 'Tarjeta Oro');
    if (!target) throw new Error('target account must exist');

    const targetRow = rows().find((row) => row.textContent?.includes(target.name));
    const editTrigger = targetRow?.querySelector<HTMLButtonElement>('button');
    if (!editTrigger) throw new Error('row edit trigger must be rendered');

    editTrigger.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.editingAccount()?.id).toBe(target.id);
  });

  it('opens the creation modal from the header button', () => {
    createButton().click();
    fixture.detectChanges();

    expect(fixture.componentInstance.createModalOpen()).toBe(true);
  });

  it('shows the distribution summary with counts and totals by account type', () => {
    const distribution = native().querySelector('app-account-type-distribution');
    if (!distribution) throw new Error('distribution summary must be rendered');

    const content = distribution.textContent ?? '';
    expect(content).toContain('Distribución');
    expect(content).toContain('Crédito');
    expect(content).toContain('-$1,200.00');
    expect(content).toContain('Ahorro');
    expect(content).toContain('2 cuentas');
    expect(content).toContain('$1,000.00');
  });

  it('links each row to the account detail view', () => {
    const detailLink = rows()[0].querySelector<HTMLAnchorElement>('a[href]');
    if (!detailLink) throw new Error('detail link must be rendered');

    expect(detailLink.getAttribute('href')).toBe('/accounts/' + accountsStore.accounts()[0].id);
    expect(detailLink.getAttribute('aria-label')).toContain('Ver detalle de');
  });
});
