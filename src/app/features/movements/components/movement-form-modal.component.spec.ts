import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideAppIcons} from '@core/icons/app-icons.provider';
import {AccountsStore} from '@core/stores/accounts.store';
import {MovementsStore} from '@core/stores/movements.store';
import {ScheduledTransactionsStore} from '@core/stores/scheduled-transactions.store';
import {MovementFormModalComponent} from './movement-form-modal.component';

describe('MovementFormModalComponent', () => {
  let fixture: ComponentFixture<MovementFormModalComponent>;
  let scheduledStore: InstanceType<typeof ScheduledTransactionsStore>;
  let movementsStore: InstanceType<typeof MovementsStore>;
  let accountsStore: InstanceType<typeof AccountsStore>;

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

  const typeButtons = (): HTMLButtonElement[] =>
    Array.from(native().querySelectorAll<HTMLButtonElement>('#mov-type button'));

  const selectTypeOption = (label: string): void => {
    const button = typeButtons().find((item) => item.textContent?.trim().includes(label));
    if (!button) throw new Error(`type option ${label} must exist`);

    button.click();
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
    accountsStore = TestBed.inject(AccountsStore);
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

  it('renders the movement type as an accessible segmented control', async () => {
    await open();

    const group = native().querySelector('#mov-type');
    if (!group) throw new Error('type segmented control must be rendered');

    expect(group.getAttribute('role')).toBe('radiogroup');
    expect(group.getAttribute('aria-label')).toBe('Tipo de movimiento');

    const buttons = typeButtons();
    expect(buttons.length).toBe(3);
    expect(buttons.map((button) => button.textContent?.trim())).toEqual([
      'Ingreso',
      'Egreso',
      'Transferencia',
    ]);
    buttons.forEach((button) => {
      expect(button.getAttribute('role')).toBe('radio');
      expect(button.getAttribute('aria-checked')).not.toBeNull();
    });
  });

  it('defaults to Egreso on new movements', async () => {
    await open();

    const checked = typeButtons().filter(
      (button) => button.getAttribute('aria-checked') === 'true',
    );
    expect(checked.length).toBe(1);

    const selected = checked[0];
    expect(selected?.textContent).toContain('Egreso');
    expect(selected?.className).toContain('bg-rose-700');
    expect(selected?.className).toContain('text-white');
  });

  it('applies the semantic high-contrast color to the active segment', async () => {
    await open();

    selectTypeOption('Ingreso');
    let selected = typeButtons().find((button) => button.getAttribute('aria-checked') === 'true');
    expect(selected?.className).toContain('bg-emerald-700');

    selectTypeOption('Transferencia');
    selected = typeButtons().find((button) => button.getAttribute('aria-checked') === 'true');
    expect(selected?.className).toContain('bg-indigo-700');
  });

  it('updates the amount input styling with the selected movement type', async () => {
    await open();

    const input = (): HTMLInputElement | null =>
      native().querySelector<HTMLInputElement>('#mov-amount');
    const symbol = (): Element | null | undefined => input()?.previousElementSibling ?? undefined;

    expect(input()?.className).toContain('border-rose-400');
    expect(input()?.className).toContain('focus:border-rose-600');
    expect(input()?.className).toContain('text-rose-700');
    expect(symbol()?.className).toContain('text-rose-700');

    selectTypeOption('Ingreso');
    expect(input()?.className).toContain('border-emerald-400');
    expect(input()?.className).toContain('focus:border-emerald-600');
    expect(input()?.className).toContain('text-emerald-700');
    expect(symbol()?.className).toContain('text-emerald-700');

    selectTypeOption('Transferencia');
    expect(input()?.className).toContain('border-indigo-400');
    expect(input()?.className).toContain('focus:border-indigo-600');
    expect(input()?.className).toContain('text-indigo-700');
    expect(symbol()?.className).toContain('text-indigo-700');
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
    expect(movementsStore.movements()[0]?.amount).toBe(50000);
    expect(scheduledStore.scheduledTransactions()).toEqual([]);
  });

  describe('edit mode', () => {
    const registerExpense = (amount = 10000): void => {
      const account = accountsStore.accounts()[0];
      if (!account) throw new Error('a seeded account is required');

      movementsStore.registerMovement({
        accountId: account.id,
        categoryId: 'services',
        type: 'EXPENSE',
        amount,
        note: 'Cena',
      });
    };

    const openEdit = async (): Promise<void> => {
      const movement = movementsStore.movements()[0];
      if (!movement) throw new Error('a movement is required');

      fixture.componentRef.setInput('editMovement', movement);
      await open();
    };

    it('prefills the form and locks the movement type', async () => {
      registerExpense();
      await openEdit();

      const title = native().querySelector('#modal-title');
      expect(title?.textContent).toContain('Editar movimiento');

      const amount = native().querySelector<HTMLInputElement>('#mov-amount');
      expect(Number(amount?.value)).toBe(100);

      const type = native().querySelector('#mov-type');
      expect(type?.getAttribute('role')).toBe('radiogroup');

      const buttons = typeButtons();
      expect(buttons.length).toBe(3);
      buttons.forEach((button) => {
        expect(button.disabled).toBe(true);
        expect(button.getAttribute('role')).toBe('radio');
        expect(button.getAttribute('aria-checked')).not.toBeNull();
      });

      expect(native().textContent).toContain(
        'El tipo de movimiento no se puede modificar una vez creado.',
      );
    });

    it('keeps the movement type unchanged when a locked segment is clicked', async () => {
      registerExpense();
      await openEdit();

      selectTypeOption('Ingreso');

      const selected = typeButtons().find(
        (button) => button.getAttribute('aria-checked') === 'true',
      );
      expect(selected?.textContent).toContain('Egreso');
      expect(selected?.className).toContain('bg-rose-700');
    });

    it('updates the movement instead of registering a new one', async () => {
      registerExpense();
      await openEdit();

      const amount = native().querySelector<HTMLInputElement>('#mov-amount');
      if (!amount) throw new Error('amount input must be rendered');
      amount.value = '150';
      amount.dispatchEvent(new Event('input', {bubbles: true}));
      fixture.detectChanges();

      submit();

      expect(movementsStore.movements().length).toBe(1);
      expect(movementsStore.movements()[0]?.amount).toBe(15000);
      expect(movementsStore.movements()[0]?.updatedAt).toBeTruthy();
    });
  });
});
