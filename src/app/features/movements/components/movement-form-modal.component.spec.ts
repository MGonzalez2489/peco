import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideAppIcons} from '@core/icons/app-icons.provider';
import {MovementsStore} from '@core/stores/movements.store';
import {ScheduledTransactionsStore} from '@core/stores/scheduled-transactions.store';
import {MovementFormModalComponent} from './movement-form-modal.component';

describe('MovementFormModalComponent', () => {
  let fixture: ComponentFixture<MovementFormModalComponent>;
  let scheduledStore: InstanceType<typeof ScheduledTransactionsStore>;
  let movementsStore: InstanceType<typeof MovementsStore>;

  const native = (): HTMLElement => fixture.nativeElement as HTMLElement;

  const open = async (): Promise<void> => {
    fixture.componentRef.setInput('isOpen', true);
    TestBed.flushEffects();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const fillAmount = async (): Promise<void> => {
    await open();

    const amount = native().querySelector('#mov-amount') as HTMLInputElement;
    amount.value = '500';
    amount.dispatchEvent(new Event('input', {bubbles: true}));
    fixture.detectChanges();
  };

  const selectTypeOption = (label: string): void => {
    const trigger = native().querySelector<HTMLButtonElement>('#mov-type');
    if (!trigger) throw new Error('type dropdown must be rendered');

    trigger.click();
    fixture.detectChanges();

    const options = Array.from(native().querySelectorAll<HTMLElement>('[role="option"]'));
    const option = options.find((item) => item.textContent?.trim() === label);
    if (!option) throw new Error(`type option ${label} must exist`);

    option.click();
    fixture.detectChanges();
  };

  const submit = (): void => {
    const button = native().querySelector<HTMLButtonElement>('button[type="submit"]');
    if (!button) throw new Error('submit button must be rendered');
    button.click();
    fixture.detectChanges();
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [MovementFormModalComponent],
      providers: [provideAppIcons()],
    });

    scheduledStore = TestBed.inject(ScheduledTransactionsStore);
    movementsStore = TestBed.inject(MovementsStore);
    fixture = TestBed.createComponent(MovementFormModalComponent);
    fixture.detectChanges();
  });

  it('renders the category and account controls as custom dropdowns', async () => {
    await open();

    const category = native().querySelector('#mov-category');
    const account = native().querySelector('#mov-account');

    expect(category?.getAttribute('role')).toBe('combobox');
    expect(account?.getAttribute('role')).toBe('combobox');
    expect(account?.textContent).toContain('Efectivo');
    expect(category?.querySelector('span[style*="background-color"]')).not.toBeNull();
  });

  it('renders the movement type as a custom dropdown with icon badges', async () => {
    await open();

    const trigger = native().querySelector<HTMLButtonElement>('#mov-type');
    if (!trigger) throw new Error('type dropdown must be rendered');

    expect(trigger.getAttribute('role')).toBe('combobox');
    expect(trigger.textContent).toContain('Egreso');
    expect(trigger.querySelector('span[style*="background-color"]')).not.toBeNull();

    trigger.click();
    fixture.detectChanges();

    const listbox = native().querySelector('[role="listbox"]');
    expect(listbox).not.toBeNull();
    expect(listbox?.querySelectorAll('[role="option"]').length).toBe(3);
  });

  it('updates the category control when an option is picked', async () => {
    await open();

    const trigger = native().querySelector<HTMLButtonElement>('#mov-category');
    if (!trigger) throw new Error('category dropdown must be rendered');

    trigger.click();
    fixture.detectChanges();

    const listbox = native().querySelector('[role="listbox"]');
    if (!listbox) throw new Error('category listbox must open');

    const option = listbox.querySelectorAll('[role="option"]').item(1) as HTMLElement;
    if (!option) throw new Error('category option must exist');
    const label = option.textContent?.trim() ?? '';

    option.click();
    fixture.detectChanges();

    expect(trigger.getAttribute('aria-label')).toContain(label);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('swaps the category control for a destination dropdown on transfers', async () => {
    await open();

    expect(native().querySelector('#mov-destino')).toBeNull();

    selectTypeOption('Transferencia');

    expect(native().querySelector('#mov-category')).toBeNull();

    const destination = native().querySelector('#mov-destino');
    expect(destination?.getAttribute('role')).toBe('combobox');
    expect(destination?.textContent).toContain('Selecciona la cuenta destino');
  });

  it('does not render any recurring controls', async () => {
    await open();

    expect(native().querySelector('input[formcontrolname="isRecurring"]')).toBeNull();
    expect(native().querySelector('input[formcontrolname="autoApply"]')).toBeNull();
    expect(native().querySelector('#mov-frequency')).toBeNull();
    expect(native().querySelector('#mov-interval')).toBeNull();
    expect(native().querySelector('#mov-stop')).toBeNull();
  });

  it('registers an immediate movement and never creates a scheduled transaction', async () => {
    await fillAmount();
    submit();

    expect(movementsStore.movements().length).toBe(1);
    expect(movementsStore.movements()[0]?.amount).toBe(500);
    expect(scheduledStore.scheduledTransactions()).toEqual([]);
  });
});
