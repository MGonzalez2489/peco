import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideAppIcons} from '@core/icons/app-icons.provider';
import {LOCAL_STORAGE_KEYS} from '@core/constants';
import {UserPreferencesStore} from '@core/stores/user-preferences.store';
import {UserPreferencesSettingsComponent} from './user-preferences-settings.component';

describe('UserPreferencesSettingsComponent', () => {
  let fixture: ComponentFixture<UserPreferencesSettingsComponent>;
  let store: InstanceType<typeof UserPreferencesStore>;

  const native = (): HTMLElement => fixture.nativeElement as HTMLElement;

  const themeTrigger = (): HTMLButtonElement => {
    const trigger = native().querySelector<HTMLButtonElement>('#pref-theme');
    if (!trigger) throw new Error('theme selector must be rendered');
    return trigger;
  };

  const selectTheme = (label: string): void => {
    themeTrigger().click();
    fixture.detectChanges();

    const option = Array.from(native().querySelectorAll<HTMLElement>('[role="option"]')).find(
      (item) => item.textContent?.trim() === label,
    );
    if (!option) throw new Error(`theme option ${label} must exist`);

    option.click();
    fixture.detectChanges();
  };

  const hideBalanceToggle = (): HTMLInputElement => {
    const toggle = native().querySelector<HTMLInputElement>('input[role="switch"]');
    if (!toggle) throw new Error('hide balance toggle must be rendered');
    return toggle;
  };

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    TestBed.configureTestingModule({
      imports: [UserPreferencesSettingsComponent],
      providers: [provideAppIcons()],
    });

    store = TestBed.inject(UserPreferencesStore);
    fixture = TestBed.createComponent(UserPreferencesSettingsComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    document.documentElement.classList.remove('dark');
  });

  it('renders the appearance row with title, description and a compact selector', () => {
    const row = themeTrigger().closest('.divide-y > div');
    const text = native().textContent ?? '';

    expect(row).not.toBeNull();
    expect(text).toContain('Apariencia');
    expect(text).toContain('Elige cómo se ve la aplicación en este dispositivo.');
    expect(themeTrigger().getAttribute('role')).toBe('combobox');
    expect(themeTrigger().textContent).toContain('Claro');
  });

  it('offers the three theme options', () => {
    themeTrigger().click();
    fixture.detectChanges();

    const labels = Array.from(native().querySelectorAll<HTMLElement>('[role="option"]')).map(
      (option) => option.textContent?.trim(),
    );

    expect(labels).toEqual(['Claro', 'Oscuro', 'Sistema']);
  });

  it('updates the store, the document theme and localStorage on selection', () => {
    selectTheme('Oscuro');

    expect(store.theme()).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.userPreferences)).toContain('"dark"');
    expect(themeTrigger().textContent).toContain('Oscuro');
  });

  it('reflects a theme change made outside the view', () => {
    store.setTheme('system');
    fixture.detectChanges();

    expect(themeTrigger().textContent).toContain('Sistema');
  });

  it('renders the accounts section with the hide balance toggle in Spanish', () => {
    const text = native().textContent ?? '';
    const toggle = hideBalanceToggle();

    expect(text).toContain('Cuentas');
    expect(text).toContain('Esconder balances');
    expect(text).toContain('Muestra o esconde los balances de las cuentas en toda la aplicación.');
    expect(toggle.checked).toBe(false);
  });

  it('toggles hideBalance in the store and persists it immediately', () => {
    hideBalanceToggle().click();
    fixture.detectChanges();

    expect(store.hideBalance()).toBe(true);
    expect(hideBalanceToggle().checked).toBe(true);

    const stored = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.userPreferences) ?? '{}');
    expect(stored.accounts.hideBalance).toBe(true);
  });

  it('reflects a hideBalance change made outside the view', () => {
    store.toggleHideBalance();
    fixture.detectChanges();

    expect(hideBalanceToggle().checked).toBe(true);
  });
});
