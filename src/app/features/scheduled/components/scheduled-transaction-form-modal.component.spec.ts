import {ComponentFixture, TestBed} from '@angular/core/testing';
import {SCHEDULED_TRANSACTION_TYPE_MAP} from '@core/constants';
import {provideAppIcons} from '@core/icons/app-icons.provider';
import {AccountsStore} from '@core/stores/accounts.store';
import {ScheduledTransactionsStore} from '@core/stores/scheduled-transactions.store';
import {ScheduledTransactionTypeKey} from '@core/types';
import {defaultStopDate, todayIsoDate, tomorrowIsoDate} from '@core/utils';
import {ScheduledTransactionFormModalComponent} from './scheduled-transaction-form-modal.component';

describe('ScheduledTransactionFormModalComponent', () => {
  let fixture: ComponentFixture<ScheduledTransactionFormModalComponent>;
  let scheduledStore: InstanceType<typeof ScheduledTransactionsStore>;

  const native = (): HTMLElement => fixture.nativeElement as HTMLElement;

  const open = async (): Promise<void> => {
    fixture.componentRef.setInput('isOpen', true);
    TestBed.flushEffects();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const setControlValue = (selector: string, value: string): void => {
    const control = native().querySelector(selector) as HTMLInputElement | HTMLSelectElement;
    if (!control) throw new Error(`control ${selector} must be rendered`);

    control.value = value;
    const eventName = control instanceof HTMLSelectElement ? 'change' : 'input';
    control.dispatchEvent(new Event(eventName, {bubbles: true}));

    TestBed.flushEffects();
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
      imports: [ScheduledTransactionFormModalComponent],
      providers: [provideAppIcons()],
    });

    scheduledStore = TestBed.inject(ScheduledTransactionsStore);
    fixture = TestBed.createComponent(ScheduledTransactionFormModalComponent);
    fixture.detectChanges();
  });

  it('focuses the name field as soon as the modal opens', async () => {
    await open();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    expect(document.activeElement).toBe(native().querySelector('#sch-name'));
  });

  it('keeps the typed values when the end condition switches to occurrences', async () => {
    await open();

    setControlValue('#sch-name', 'Internet fibra');
    setControlValue('#sch-stop', 'INTERVAL');
    setControlValue('#sch-frequency', 'WEEKLY');

    expect(native().querySelector('#sch-occurrences')).toBeNull();

    setControlValue('#sch-stop', 'OCCURRENCES');

    expect(native().querySelector<HTMLInputElement>('#sch-name')?.value).toBe('Internet fibra');
    expect(native().querySelector('#sch-occurrences')).not.toBeNull();
  });

  it('creates a schedule keeping the frequency and interval with the default stop condition', async () => {
    await open();

    setControlValue('#sch-name', 'Internet fibra');
    setControlValue('#sch-amount', '800');
    setControlValue('#sch-frequency', 'WEEKLY');

    submit();

    const created = scheduledStore.scheduledTransactions()[0];
    expect(created?.frequency).toBe('WEEKLY');
    expect(created?.interval).toBe(1);
    expect(created?.totalOccurrences).toBeUndefined();
    expect(created?.endDate).toBeUndefined();
  });

  it('preserves the frequency and interval when editing an existing schedule', async () => {
    const account = TestBed.inject(AccountsStore).accounts()[0];
    const created = scheduledStore.createScheduledTransaction({
      name: 'Alquiler',
      estimatedAmount: 500,
      type: SCHEDULED_TRANSACTION_TYPE_MAP[ScheduledTransactionTypeKey.EXPENSE],
      categoryId: 'services',
      sourceAccountId: account.id,
      frequency: 'MONTHLY',
      interval: 2,
      nextExecutionDate: '2030-01-01',
      autoApply: false,
      active: true,
    });
    if (!created) throw new Error('schedule must be created');

    fixture.componentRef.setInput('schedule', created);
    fixture.componentRef.setInput('isOpen', true);
    TestBed.flushEffects();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    submit();

    const updated = scheduledStore.scheduleById(created.id);
    expect(updated?.frequency).toBe('MONTHLY');
    expect(updated?.interval).toBe(2);
  });

  it('defaults the next execution date to tomorrow and limits the picker', async () => {
    await open();

    const next = native().querySelector('#sch-next') as HTMLInputElement | null;
    if (!next) throw new Error('next execution input must be rendered');

    expect(next.value).toBe(tomorrowIsoDate());
    expect(next.getAttribute('min')).toBe(tomorrowIsoDate());
  });

  it('blocks scheduling when the next execution date is today or in the past', async () => {
    await open();

    setControlValue('#sch-name', 'Internet fibra');
    setControlValue('#sch-amount', '800');
    setControlValue('#sch-next', todayIsoDate());

    submit();

    expect(scheduledStore.scheduledTransactions().length).toBe(0);
    expect(native().textContent).toContain('Selecciona una fecha a partir de mañana.');
  });

  it('shows a chevron indicator on the date input', async () => {
    await open();

    const next = native().querySelector('#sch-next');
    if (!next) throw new Error('next execution input must be rendered');

    expect(next.parentElement?.classList.contains('relative')).toBe(true);
    expect(next.parentElement?.querySelector('app-icon')).not.toBeNull();
    expect(next.classList.contains('pr-10')).toBe(true);
  });

  it('opens the native date picker when the date input is clicked', async () => {
    await open();

    const next = native().querySelector('#sch-next') as HTMLInputElement | null;
    if (!next) throw new Error('next execution input must be rendered');

    let opened = false;
    next.showPicker = () => {
      opened = true;
    };

    next.click();

    expect(opened).toBe(true);
  });

  it('renders the schedule type as a custom dropdown with icon badges', async () => {
    await open();

    const trigger = native().querySelector<HTMLButtonElement>('#sch-type');
    if (!trigger) throw new Error('type dropdown must be rendered');

    expect(trigger.getAttribute('role')).toBe('combobox');
    expect(trigger.querySelector('span[style*="background-color"]')).not.toBeNull();

    trigger.click();
    fixture.detectChanges();

    const listbox = native().querySelector('[role="listbox"]');
    expect(listbox).not.toBeNull();
    expect(listbox?.querySelectorAll('[role="option"]').length).toBe(3);
  });

  it('replaces the category control with an accessible custom dropdown', async () => {
    await open();

    const trigger = native().querySelector<HTMLButtonElement>('#sch-category');
    if (!trigger) throw new Error('category dropdown must be rendered');

    expect(trigger.getAttribute('role')).toBe('combobox');
    expect(trigger.getAttribute('aria-haspopup')).toBe('listbox');
    expect(trigger.querySelector('span[style*="background-color"]')).not.toBeNull();

    trigger.click();
    fixture.detectChanges();

    const listbox = native().querySelector('[role="listbox"]');
    expect(listbox).not.toBeNull();
    expect(listbox?.querySelectorAll('[role="option"]').length).toBeGreaterThan(0);
    expect(listbox?.querySelector('[aria-selected="true"]')).not.toBeNull();
  });

  it('prefills one occurrence and clears the property when the condition changes', async () => {
    await open();

    setControlValue('#sch-name', 'Internet fibra');
    setControlValue('#sch-amount', '800');
    setControlValue('#sch-stop', 'OCCURRENCES');

    const occurrences = native().querySelector('#sch-occurrences') as HTMLInputElement;
    expect(occurrences.value).toBe('1');

    setControlValue('#sch-stop', 'NEVER');
    expect(native().querySelector('#sch-occurrences')).toBeNull();

    submit();

    const created = scheduledStore.scheduledTransactions()[0];
    expect(created?.totalOccurrences).toBeUndefined();
  });

  it('prefills the end date using the next execution date and frequency', async () => {
    await open();

    setControlValue('#sch-name', 'Internet fibra');
    setControlValue('#sch-amount', '800');
    setControlValue('#sch-next', '2026-05-01');
    setControlValue('#sch-stop', 'DATE');

    const endDate = native().querySelector('#sch-end-date') as HTMLInputElement;
    expect(endDate.value).toBe(defaultStopDate('2026-05-01', 'MONTHLY', 1));

    setControlValue('#sch-frequency', 'WEEKLY');
    expect(endDate.value).toBe(defaultStopDate('2026-05-01', 'WEEKLY', 1));

    endDate.value = '2030-06-15';
    endDate.dispatchEvent(new Event('input', {bubbles: true}));
    fixture.detectChanges();

    setControlValue('#sch-frequency', 'YEARLY');
    expect(endDate.value).toBe('2030-06-15');
  });

  it('preserves a stored end date when editing a schedule', async () => {
    const account = TestBed.inject(AccountsStore).accounts()[0];
    const created = scheduledStore.createScheduledTransaction({
      name: 'Alquiler',
      estimatedAmount: 500,
      type: SCHEDULED_TRANSACTION_TYPE_MAP[ScheduledTransactionTypeKey.EXPENSE],
      categoryId: 'services',
      sourceAccountId: account.id,
      frequency: 'WEEKLY',
      interval: 1,
      nextExecutionDate: '2030-01-01',
      autoApply: false,
      active: true,
      endDate: '2031-05-05',
    });
    if (!created) throw new Error('schedule must be created');

    fixture.componentRef.setInput('schedule', created);
    fixture.componentRef.setInput('isOpen', true);
    TestBed.flushEffects();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const endDate = native().querySelector('#sch-end-date') as HTMLInputElement;
    expect(endDate.value).toBe('2031-05-05');
  });
});
