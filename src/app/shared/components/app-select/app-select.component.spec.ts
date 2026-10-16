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
