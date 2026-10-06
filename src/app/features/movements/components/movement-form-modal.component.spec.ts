import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideAppIcons} from '@core/icons/app-icons.provider';
import {MovementFormModalComponent} from './movement-form-modal.component';

describe('MovementFormModalComponent', () => {
  let fixture: ComponentFixture<MovementFormModalComponent>;

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

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [MovementFormModalComponent],
      providers: [provideAppIcons()],
    });

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

    changeNativeSelect('#mov-type', 'TRANSFER');

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
});
