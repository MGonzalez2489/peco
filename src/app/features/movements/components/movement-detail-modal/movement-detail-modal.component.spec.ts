import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideAppIcons} from '@core/icons/app-icons.provider';
import {Movement} from '@core/models';
import {AccountsStore} from '@core/stores/accounts.store';
import {CatalogStore} from '@core/stores/catalog.store';
import {ScheduledTransactionsStore} from '@core/stores/scheduled-transactions.store';
import {MovementDetailModalComponent} from './movement-detail-modal.component';

const baseMovement = (overrides: Partial<Movement> = {}): Movement => ({
  id: 'm-1',
  accountId: 'c-cash',
  categoryId: 'services',
  type: 'EXPENSE',
  amount: 861,
  date: new Date(2026, 9, 16, 6, 50).toISOString(),
  ...overrides,
});

describe('MovementDetailModalComponent', () => {
  let fixture: ComponentFixture<MovementDetailModalComponent>;

  const native = (): HTMLElement => fixture.nativeElement as HTMLElement;

  const open = async (movement: Movement): Promise<void> => {
    fixture = TestBed.createComponent(MovementDetailModalComponent);
    fixture.componentRef.setInput('movement', movement);
    fixture.componentRef.setInput('isOpen', true);
    TestBed.flushEffects();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const dialogText = (): string => native().querySelector('[role="dialog"]')?.textContent ?? '';

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [MovementDetailModalComponent],
      providers: [provideAppIcons(), AccountsStore, CatalogStore, ScheduledTransactionsStore],
    });

    fixture = TestBed.createComponent(MovementDetailModalComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.classList.remove('overflow-hidden');
  });

  it('stays hidden while isOpen is false', () => {
    expect(native().querySelector('[role="dialog"]')).toBeNull();
  });

  it('renders amount, category, account and type badge for an expense', async () => {
    await open(baseMovement());

    const text = dialogText();
    expect(text).toContain('-$861.00');
    expect(text).toContain('Servicios');
    expect(text).toContain('Efectivo');
    expect(text).toContain('Cuenta Base');
    expect(text).toContain('Egreso registrado');
  });

  it('formats the execution date in long Spanish form with time', async () => {
    await open(baseMovement());

    expect(native().textContent).toContain('16 de Octubre de 2026');
    expect(native().textContent).toContain('06:50 AM');
  });

  it('renders the note and a clean placeholder when it is empty', async () => {
    await open(baseMovement({note: 'Cena con amigos'}));
    expect(native().textContent).toContain('Cena con amigos');

    await open(baseMovement({note: undefined}));
    expect(native().textContent).toContain('Sin notas adicionales');
  });

  it('renders origin and destination for transfers', async () => {
    await open(baseMovement({type: 'TRANSFER', categoryId: 'transfer', targetAccountId: 'c-cash'}));

    expect(native().textContent).toContain('Origen');
    expect(native().textContent).toContain('Destino');
    expect(native().textContent).toContain('Transferencia registrada');
  });

  it('is strictly read-only', async () => {
    await open(baseMovement());

    expect(native().querySelector('input, select, textarea')).toBeNull();
  });

  it('emits close when the Cerrar button is pressed', async () => {
    await open(baseMovement());

    let closes = 0;
    fixture.componentInstance.close.subscribe(() => (closes += 1));

    const button = Array.from(native().querySelectorAll('button')).find((item) =>
      item.textContent?.includes('Cerrar'),
    );
    button?.click();

    expect(closes).toBe(1);
  });

  it('emits close on Escape', async () => {
    await open(baseMovement());

    let closes = 0;
    fixture.componentInstance.close.subscribe(() => (closes += 1));

    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));

    expect(closes).toBe(1);
  });

  it('keeps the sheet mounted and populated during the exit animation, then removes it', async () => {
    await open(baseMovement());
    expect(native().querySelector('[role="dialog"]')).not.toBeNull();

    vi.useFakeTimers();
    // The parent clears the selection as soon as it closes; the sheet must keep
    // rendering the last movement while it fades out.
    fixture.componentRef.setInput('isOpen', false);
    fixture.componentRef.setInput('movement', null);
    TestBed.flushEffects();
    fixture.detectChanges();

    const closingDialog = native().querySelector('[role="dialog"]');
    expect(closingDialog).not.toBeNull();
    expect(closingDialog?.textContent).toContain('-$861.00');
    expect(closingDialog?.textContent).toContain('Servicios');

    vi.advanceTimersByTime(250);
    fixture.detectChanges();

    expect(native().querySelector('[role="dialog"]')).toBeNull();
  });
});
