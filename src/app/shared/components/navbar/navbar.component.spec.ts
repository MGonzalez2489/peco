import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {provideAppIcons} from '@core/icons/app-icons.provider';
import {GlobalPeriodStore} from '@core/stores/global-period.store';
import {shiftPeriod} from '@core/utils';
import {NavbarComponent} from './navbar.component';

describe('NavbarComponent', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [provideRouter([]), provideAppIcons(), GlobalPeriodStore],
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the global period selector on the current month', () => {
    const fixture = TestBed.createComponent(NavbarComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const mobileLogo = compiled.querySelector('a[aria-label="Peco — Inicio"] span');

    expect(compiled.querySelector('app-global-period-selector')).not.toBeNull();
    expect(mobileLogo?.textContent).toContain('Peco');
    expect(mobileLogo?.classList.contains('hidden')).toBe(false);
    expect(compiled.textContent).toContain(new Date().getFullYear().toString());
    expect(compiled.textContent).not.toContain('Ir a hoy');
  });

  it('portals the period picker to the body so the mobile sheet is not clipped', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('max-width'),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );

    const fixture = TestBed.createComponent(NavbarComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-month-picker-bottom-sheet')).toBeNull();

    const picker = document.body.querySelector('app-month-picker-bottom-sheet');
    expect(picker).not.toBeNull();

    const trigger = compiled.querySelector<HTMLButtonElement>(
      'button[aria-label="Seleccionar período"]',
    );
    trigger!.click();
    fixture.detectChanges();

    const dialog = picker!.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.textContent).toContain('Ene');
    expect(dialog?.textContent).toContain('Aplicar');
  });

  it('offers Ir a hoy inside the period sheet and locks registration on a past period', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('max-width'),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );

    const store = TestBed.inject(GlobalPeriodStore);
    const previous = shiftPeriod(store.selectedPeriodKey(), -1);
    const [year, month] = previous.split('-').map(Number);
    store.setPeriod(year, month);

    const fixture = TestBed.createComponent(NavbarComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const registerButton = Array.from(compiled.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Registrar'),
    );

    expect(registerButton).not.toBeUndefined();
    expect(registerButton?.disabled).toBe(true);
    expect(compiled.textContent).not.toContain('Ir a hoy');

    const trigger = compiled.querySelector<HTMLButtonElement>(
      'button[aria-label="Seleccionar período"]',
    );
    trigger!.click();
    fixture.detectChanges();

    const dialog = document.body.querySelector('[role="dialog"]');
    const todayButton = Array.from(dialog?.querySelectorAll('button') ?? []).find((button) =>
      button.textContent?.includes('Ir a hoy'),
    );

    expect(todayButton).not.toBeUndefined();
    expect(store.isPastPeriod()).toBe(true);

    todayButton!.click();
    fixture.detectChanges();

    expect(store.isCurrentPeriod()).toBe(true);
    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });
});
