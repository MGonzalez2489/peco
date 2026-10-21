import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {provideAppIcons} from '@core/icons/app-icons.provider';
import {Account} from '@core/models';
import {AccountListComponent} from './account-list.component';

const buildAccount = (overrides: Partial<Account>): Account => ({
  id: crypto.randomUUID(),
  name: 'Cuenta',
  currentBalance: 0,
  type: 'CASH',
  includeInTotal: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('AccountListComponent', () => {
  let fixture: ComponentFixture<AccountListComponent>;
  let accounts: Account[];

  const native = (): HTMLElement => fixture.nativeElement as HTMLElement;

  const rows = (): HTMLElement[] =>
    Array.from(native().querySelectorAll<HTMLElement>('[data-testid="account-row"]'));

  const rowByName = (name: string): HTMLElement => {
    const row = rows().find((item) => item.textContent?.includes(name));
    if (!row) throw new Error(`row "${name}" must be rendered`);
    return row;
  };

  beforeEach(() => {
    accounts = [
      buildAccount({
        name: 'Efectivo',
        currentBalance: 0,
        type: 'CASH',
        isRoot: true,
        includeInTotal: false,
      }),
      buildAccount({
        name: 'Ahorro viaje',
        currentBalance: 800,
        type: 'SAVINGS',
        targetGoal: 2000,
        pinToHome: true,
      }),
      buildAccount({
        name: 'Tarjeta Oro',
        currentBalance: -1200,
        type: 'CREDIT',
        creditLimit: 5000,
      }),
    ];

    TestBed.configureTestingModule({
      imports: [AccountListComponent],
      providers: [provideAppIcons(), provideRouter([])],
    });

    fixture = TestBed.createComponent(AccountListComponent);
    fixture.componentRef.setInput('accounts', accounts);
    fixture.detectChanges();
  });

  it('renders one row per account', () => {
    expect(rows().length).toBe(accounts.length);

    const content = native().textContent ?? '';
    expect(content).toContain('Efectivo');
    expect(content).toContain('Ahorro viaje');
    expect(content).toContain('Tarjeta Oro');
  });

  it('shows the savings goal progress', () => {
    const content = rowByName('Ahorro viaje').textContent ?? '';

    expect(content).toContain('Meta: $2,000.00');
    expect(content).toContain('40%');
  });

  it('shows the remaining credit for liability accounts', () => {
    const content = rowByName('Tarjeta Oro').textContent ?? '';

    expect(content).toContain('Queda: $3,800.00');
    expect(content).toContain('76% disp.');
    expect(content).toContain('-$1,200.00');
  });

  it('renders the account type icon tile with a soft background', () => {
    const tile = rowByName('Tarjeta Oro').querySelector<HTMLElement>('span[aria-hidden="true"]');
    if (!tile) throw new Error('type icon tile must be rendered');

    expect(tile.className).toContain('rounded-xl');
    expect(tile.querySelector('app-icon svg')).not.toBeNull();
    expect(fixture.componentInstance.accountIconBackground(accounts[2])).toBe(
      fixture.componentInstance.accountIconColor(accounts[2]) + '20',
    );
  });

  it('renders the root, pin and exclusion badges', () => {
    expect(rowByName('Efectivo').textContent).toContain('Base');
    expect(rowByName('Efectivo').textContent).toContain('Excluida del total');
    expect(
      rowByName('Ahorro viaje').querySelector('[aria-label="Fijada en Inicio"]'),
    ).not.toBeNull();
  });

  it('links each row to the account detail view', () => {
    const link = rowByName('Ahorro viaje').querySelector<HTMLAnchorElement>('a[href]');
    if (!link) throw new Error('detail link must be rendered');

    expect(link.getAttribute('href')).toBe('/accounts/' + accounts[1].id);
    expect(link.getAttribute('aria-label')).toBe('Ver detalle de Ahorro viaje');
  });
});
