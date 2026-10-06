import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideAppIcons} from '@core/icons/app-icons.provider';
import {ScheduledTransactionFormModalComponent} from './scheduled-transaction-form-modal.component';

describe('ScheduledTransactionFormModalComponent', () => {
  let fixture: ComponentFixture<ScheduledTransactionFormModalComponent>;

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

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [ScheduledTransactionFormModalComponent],
      providers: [provideAppIcons()],
    });

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
    setControlValue('#sch-frequency', 'WEEKLY');

    expect(native().querySelector('#sch-occurrences')).toBeNull();

    setControlValue('#sch-stop', 'OCCURRENCES');

    expect(native().querySelector<HTMLInputElement>('#sch-name')?.value).toBe('Internet fibra');
    expect(native().querySelector<HTMLSelectElement>('#sch-frequency')?.value).toBe('WEEKLY');
    expect(native().querySelector('#sch-occurrences')).not.toBeNull();
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
});
