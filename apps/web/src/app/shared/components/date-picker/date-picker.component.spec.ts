import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideAppIcons} from '@core/icons/app-icons.provider';
import {todayIsoDate} from '@core/utils';
import {DatePickerComponent} from './date-picker.component';

describe('DatePickerComponent', () => {
  let fixture: ComponentFixture<DatePickerComponent>;

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

    fixture = TestBed.createComponent(DatePickerComponent);
    fixture.componentRef.setInput('ariaLabel', 'Fecha');
    fixture.detectChanges();
  };

  const openSheet = (): HTMLElement => {
    const trigger = fixture.nativeElement.querySelector('button') as HTMLButtonElement | null;
    if (!trigger) throw new Error('date trigger must be rendered');

    trigger.click();
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement | null;
    if (!dialog) throw new Error('date bottom sheet must open');

    return dialog;
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DatePickerComponent],
      providers: [provideAppIcons()],
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders a native date input on desktop', () => {
    create(true);

    const input = fixture.nativeElement.querySelector('input[type="date"]');
    expect(input).not.toBeNull();
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });

  it('renders a trigger button instead of the native input on mobile', () => {
    create(false);

    expect(fixture.nativeElement.querySelector('input[type="date"]')).toBeNull();

    const trigger = fixture.nativeElement.querySelector('button');
    expect(trigger).not.toBeNull();
    expect(trigger?.textContent).toContain('Selecciona una fecha');
  });

  it('opens a calendar bottom sheet and emits the picked day immediately', () => {
    create(false);

    const selection: string[] = [];
    fixture.componentInstance.registerOnChange((value) => selection.push(value));

    const dialog = openSheet();

    const today = dialog.querySelector<HTMLButtonElement>('[aria-current="date"]');
    if (!today) throw new Error('today cell must be rendered');

    today.click();
    fixture.detectChanges();

    expect(selection).toEqual([todayIsoDate()]);
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
  });

  it('disables days outside the allowed min and max range', () => {
    create(false);
    fixture.componentRef.setInput('min', '2030-01-10');
    fixture.componentRef.setInput('max', '2030-01-20');
    fixture.componentInstance.writeValue('2030-01-15');
    fixture.detectChanges();

    const dialog = openSheet();

    const dayButton = (label: string): HTMLButtonElement => {
      const button = dialog.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
      if (!button) throw new Error(`day ${label} must be rendered`);
      return button;
    };

    expect(dayButton('05/01/2030').disabled).toBe(true);
    expect(dayButton('15/01/2030').disabled).toBe(false);
    expect(dayButton('25/01/2030').disabled).toBe(true);
  });

  it('consumes Escape while the sheet is open so the parent container survives', () => {
    create(false);

    const sheet = openSheet();

    const onDocumentKeydown = vi.fn();
    document.addEventListener('keydown', onDocumentKeydown);

    sheet.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    fixture.detectChanges();

    document.removeEventListener('keydown', onDocumentKeydown);

    expect(onDocumentKeydown).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
  });
});
