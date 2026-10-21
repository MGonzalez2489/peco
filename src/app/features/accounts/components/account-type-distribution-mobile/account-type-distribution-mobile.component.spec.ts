import {ComponentFixture, TestBed} from '@angular/core/testing';
import {AccountTypeSummary} from '@core/models';
import {AccountTypeDistributionMobileComponent} from './account-type-distribution-mobile.component';

const buildSummary = (overrides: Partial<AccountTypeSummary>): AccountTypeSummary => ({
  type: 'CASH',
  label: 'Efectivo',
  count: 0,
  total: 0,
  color: 'emerald',
  icon: 'banknote',
  ...overrides,
});

describe('AccountTypeDistributionMobileComponent', () => {
  let fixture: ComponentFixture<AccountTypeDistributionMobileComponent>;

  const native = (): HTMLElement => fixture.nativeElement as HTMLElement;

  const columns = (): HTMLElement[] =>
    Array.from(native().querySelectorAll<HTMLElement>('[role="listitem"]'));

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [AccountTypeDistributionMobileComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountTypeDistributionMobileComponent);
    fixture.componentRef.setInput('summaries', [
      buildSummary({type: 'CASH', label: 'Efectivo', count: 1, total: 250}),
      buildSummary({type: 'DEBIT', label: 'Débito', count: 2, total: 1000}),
      buildSummary({type: 'CREDIT', label: 'Crédito', count: 1, total: -1200}),
      buildSummary({type: 'SAVINGS', label: 'Ahorro', count: 3, total: 450}),
    ]);
    fixture.detectChanges();
  });

  it('renders the four canonical account type columns in a two column grid', () => {
    expect(columns().length).toBe(4);
    expect(native().querySelector('.grid')?.className).toContain('grid-cols-2');

    const content = native().textContent ?? '';
    expect(content).toContain('Efectivo');
    expect(content).toContain('Débito');
    expect(content).toContain('Crédito');
    expect(content).toContain('Ahorro');
  });

  it('shows the balance and the account count of every type', () => {
    const content = native().textContent ?? '';

    expect(content).toContain('$250.00');
    expect(content).toContain('$1,000.00');
    expect(content).toContain('-$1,200.00');
    expect(content).toContain('$450.00');
    expect(content).toContain('1 cuenta');
    expect(content).toContain('2 cuentas');
    expect(content).toContain('3 cuentas');
  });

  it('keeps a column for the account types without accounts', () => {
    fixture.componentRef.setInput('summaries', [
      buildSummary({type: 'CASH', count: 1, total: 100}),
    ]);
    fixture.detectChanges();

    expect(columns().length).toBe(4);

    const content = native().textContent ?? '';
    expect(content).toContain('0 cuentas');
    expect(content).toContain('$0.00');
  });

  it('flags credit liabilities with the danger tone', () => {
    const credit = columns()[2];
    const balance = credit?.querySelectorAll('p')[1];

    expect(balance?.className).toContain('text-rose-600');
  });

  it('keeps positive balances on the default text tone', () => {
    const cash = columns()[0];
    const balance = cash?.querySelectorAll('p')[1];

    expect(balance?.className).toContain('text-slate-900');
  });
});
