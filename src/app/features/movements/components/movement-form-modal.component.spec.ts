import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideAppIcons} from '@core/icons/app-icons.provider';
import {ScheduledTransactionsStore} from '@core/stores/scheduled-transactions.store';
import {defaultStopDate, todayIsoDate} from '@core/utils';
import {MovementFormModalComponent} from './movement-form-modal.component';

describe('MovementFormModalComponent', () => {
  let fixture: ComponentFixture<MovementFormModalComponent>;
  let scheduledStore: InstanceType<typeof ScheduledTransactionsStore>;

  const native = (): HTMLElement => fixture.nativeElement as HTMLElement;

  const open = async (): Promise<void> => {
    fixture.componentRef.setInput('isOpen', true);
    TestBed.flushEffects();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const changeNativeSelect = (selector: string, value: string): void => {
    const select = native().querySelector(selector) as HTMLSelectElement;
    if (!select) throw new Error(`select ${selector} must be rendered`);

    select.value = value;
    select.dispatchEvent(new Event('change', {bubbles: true}));
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

  const fillAmountAndRepeat = async (interval?: string): Promise<void> => {
    await open();

    const amount = native().querySelector('#mov-amount') as HTMLInputElement;
    amount.value = '500';
    amount.dispatchEvent(new Event('input', {bubbles: true}));
    fixture.detectChanges();

    const recurring = native().querySelector<HTMLInputElement>(
      'input[formcontrolname="isRecurring"]',
    );
    if (!recurring) throw new Error('recurring checkbox must be rendered');
    recurring.click();
    fixture.detectChanges();

    if (interval !== undefined) {
      const intervalInput = native().querySelector('#mov-interval') as HTMLInputElement;
      intervalInput.value = interval;
      intervalInput.dispatchEvent(new Event('input', {bubbles: true}));
      fixture.detectChanges();
    }
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

  it('shows a chevron indicator on the end date input', async () => {
    await open();

    const recurring = native().querySelector<HTMLInputElement>(
      'input[formcontrolname="isRecurring"]',
    );
    if (!recurring) throw new Error('recurring checkbox must be rendered');

    recurring.click();
    fixture.detectChanges();
    changeNativeSelect('#mov-stop', 'DATE');

    const endDate = native().querySelector('#mov-end-date');
    if (!endDate) throw new Error('end date input must be rendered');

    expect(endDate.parentElement?.classList.contains('relative')).toBe(true);
    expect(endDate.parentElement?.querySelector('app-icon')).not.toBeNull();
    expect(endDate.classList.contains('pr-10')).toBe(true);
  });

  it('shows the frequency and interval controls whenever the movement is recurring', async () => {
    await open();

    expect(native().querySelector('#mov-frequency')).toBeNull();

    const recurring = native().querySelector<HTMLInputElement>(
      'input[formcontrolname="isRecurring"]',
    );
    if (!recurring) throw new Error('recurring checkbox must be rendered');
    recurring.click();
    fixture.detectChanges();

    expect(native().querySelector('#mov-frequency')).not.toBeNull();
    expect(native().querySelector('#mov-interval')).not.toBeNull();
  });

  it('keeps the frequency and interval with the default stop condition', async () => {
    await fillAmountAndRepeat();
    submit();

    const created = scheduledStore.scheduledTransactions()[0];
    expect(created?.frequency).toBe('MONTHLY');
    expect(created?.interval).toBe(1);
    expect(scheduledStore.monthlyCommitmentsSummary().totalExpenses).toBe(500);
  });

  it('persists the frequency and interval with the occurrences stop condition', async () => {
    await fillAmountAndRepeat('2');
    changeNativeSelect('#mov-stop', 'OCCURRENCES');

    const occurrences = native().querySelector('#mov-occurrences') as HTMLInputElement;
    occurrences.value = '3';
    occurrences.dispatchEvent(new Event('input', {bubbles: true}));
    fixture.detectChanges();

    submit();

    const created = scheduledStore.scheduledTransactions()[0];
    expect(created?.frequency).toBe('MONTHLY');
    expect(created?.interval).toBe(2);
    expect(created?.totalOccurrences).toBe(3);
  });

  it('persists a custom recurrence interval', async () => {
    await fillAmountAndRepeat('2');
    submit();

    const created = scheduledStore.scheduledTransactions()[0];
    expect(created?.interval).toBe(2);
    expect(created?.frequency).toBe('MONTHLY');
    expect(scheduledStore.monthlyCommitmentsSummary().totalExpenses).toBe(250);
  });

  it('prefills one occurrence and clears the property when the condition changes', async () => {
    await fillAmountAndRepeat();
    changeNativeSelect('#mov-stop', 'OCCURRENCES');

    const occurrences = native().querySelector('#mov-occurrences') as HTMLInputElement;
    expect(occurrences.value).toBe('1');

    changeNativeSelect('#mov-stop', 'NEVER');
    expect(native().querySelector('#mov-occurrences')).toBeNull();

    submit();

    const created = scheduledStore.scheduledTransactions()[0];
    expect(created?.totalOccurrences).toBeUndefined();
  });

  it('prefills the end date, recalculates it and respects manual edits', async () => {
    await fillAmountAndRepeat();
    changeNativeSelect('#mov-stop', 'DATE');

    const endDate = native().querySelector('#mov-end-date') as HTMLInputElement;
    expect(endDate.value).toBe(defaultStopDate(todayIsoDate(), 'MONTHLY', 1));

    changeNativeSelect('#mov-frequency', 'WEEKLY');
    expect(endDate.value).toBe(defaultStopDate(todayIsoDate(), 'WEEKLY', 1));

    endDate.value = '2030-06-15';
    endDate.dispatchEvent(new Event('input', {bubbles: true}));
    fixture.detectChanges();

    changeNativeSelect('#mov-frequency', 'YEARLY');
    expect(endDate.value).toBe('2030-06-15');
  });

  it('persists the prefilled end date for the date stop condition', async () => {
    await fillAmountAndRepeat();
    changeNativeSelect('#mov-stop', 'DATE');
    submit();

    const created = scheduledStore.scheduledTransactions()[0];
    expect(created?.endDate).toBe(defaultStopDate(todayIsoDate(), 'MONTHLY', 1));
    expect(created?.totalOccurrences).toBeUndefined();
  });
});
