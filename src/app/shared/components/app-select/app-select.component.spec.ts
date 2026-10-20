import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideAppIcons} from '@core/icons/app-icons.provider';
import {SelectOption} from '@core/models';
import {AppSelectComponent} from './app-select.component';

describe('AppSelectComponent', () => {
  let fixture: ComponentFixture<AppSelectComponent>;

  const options: SelectOption[] = [
    {value: 'cash', label: 'Efectivo'},
    {value: 'bank', label: 'Banco'},
  ];

  const stubViewport = (isDesktop: boolean): void => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: isDesktop,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );
  };

  /** The viewport query is read on construction, so it must be stubbed first. */
  const create = (isDesktop: boolean): void => {
    stubViewport(isDesktop);

    fixture = TestBed.createComponent(AppSelectComponent);
    fixture.componentRef.setInput('ariaLabel', 'Cuenta');
    fixture.componentRef.setInput('options', options);
    fixture.detectChanges();
  };

  const open = (): void => {
    const trigger = fixture.nativeElement.querySelector('button') as HTMLButtonElement | null;
    if (!trigger) throw new Error('select trigger must be rendered');

    trigger.click();
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AppSelectComponent],
      providers: [provideAppIcons()],
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('opens a popover listbox on desktop', () => {
    create(true);
    open();

    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();

    const listbox = fixture.nativeElement.querySelector('[role="listbox"]');
    expect(listbox?.querySelectorAll('[role="option"]').length).toBe(2);
  });

  it('opens a bottom sheet on mobile', () => {
    create(false);
    open();

    const dialog = fixture.nativeElement.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.querySelectorAll('[role="option"]').length).toBe(2);
  });

  it('applies the tapped option immediately on mobile and closes the sheet', () => {
    create(false);

    const changes: string[] = [];
    fixture.componentInstance.registerOnChange((value) => changes.push(value));

    open();

    const dialog = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement | null;
    if (!dialog) throw new Error('select bottom sheet must open');

    const option = Array.from(dialog.querySelectorAll<HTMLElement>('[role="option"]')).find(
      (item) => item.textContent?.trim() === 'Banco',
    );
    if (!option) throw new Error('bank option must exist');

    option.click();
    fixture.detectChanges();

    expect(changes).toEqual(['bank']);
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
  });

  it('reflects the signal `value` input and emits `valueChange` on selection', () => {
    create(true);

    const emitted: string[] = [];
    fixture.componentInstance.valueChange.subscribe((value) => emitted.push(value));

    // Parent-controlled value: the trigger follows the input.
    fixture.componentRef.setInput('value', 'bank');
    fixture.detectChanges();
    expect(fixture.componentInstance.selectedOption()?.label).toBe('Banco');

    open();

    const listbox = fixture.nativeElement.querySelector('[role="listbox"]') as HTMLElement | null;
    if (!listbox) throw new Error('listbox must be open');

    const cash = Array.from(listbox.querySelectorAll('[role="option"]')).find(
      (option) => option.textContent?.trim() === 'Efectivo',
    );
    if (!cash) throw new Error('cash option must exist');

    (cash as HTMLElement).click();
    fixture.detectChanges();

    expect(emitted).toEqual(['cash']);

    // The parent writes the emitted value back, closing the reactive loop.
    fixture.componentRef.setInput('value', 'cash');
    fixture.detectChanges();

    expect(fixture.componentInstance.selectedOption()?.label).toBe('Efectivo');
    expect(fixture.nativeElement.querySelector('button')?.textContent).toContain('Efectivo');
  });

  it('closes the bottom sheet from its close link on mobile', () => {
    create(false);
    open();

    const dialog = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement | null;
    if (!dialog) throw new Error('select bottom sheet must open');

    const closeButton = Array.from(dialog.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => button.textContent?.includes('Cerrar'),
    );
    if (!closeButton) throw new Error('close button must exist');

    closeButton.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
  });
});
