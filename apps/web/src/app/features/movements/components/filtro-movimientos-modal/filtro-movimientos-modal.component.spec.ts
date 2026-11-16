import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideAppIcons} from '@core/icons/app-icons.provider';
import {MovementsStore} from '@core/stores/movements.store';
import {FiltroMovimientosModalComponent} from './filtro-movimientos-modal.component';

describe('FiltroMovimientosModalComponent', () => {
  let fixture: ComponentFixture<FiltroMovimientosModalComponent>;
  let movementsStore: InstanceType<typeof MovementsStore>;

  const native = (): HTMLElement => fixture.nativeElement as HTMLElement;

  const open = async (): Promise<void> => {
    fixture.componentRef.setInput('isOpen', true);
    TestBed.flushEffects();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const setText = (selector: string, value: string): void => {
    const input = native().querySelector<HTMLInputElement>(selector);
    if (!input) throw new Error(`${selector} must be rendered`);

    input.value = value;
    input.dispatchEvent(new Event('input', {bubbles: true}));
    fixture.detectChanges();
  };

  const selectOption = (selector: string, label: string): void => {
    const trigger = native().querySelector<HTMLButtonElement>(selector);
    if (!trigger) throw new Error(`${selector} must be rendered`);

    trigger.click();
    fixture.detectChanges();

    const options = Array.from(native().querySelectorAll<HTMLLIElement>('[role="option"]'));
    const option = options.find((item) => item.textContent?.includes(label));
    if (!option) throw new Error(`option "${label}" must be rendered`);

    option.click();
    fixture.detectChanges();
  };

  const applyFilters = (): void => {
    const button = Array.from(native().querySelectorAll<HTMLButtonElement>('button')).find((item) =>
      item.textContent?.includes('Aplicar filtros'),
    );
    if (!button) throw new Error('apply button must be rendered');

    button.click();
    fixture.detectChanges();
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [FiltroMovimientosModalComponent],
      providers: [provideAppIcons()],
    });

    movementsStore = TestBed.inject(MovementsStore);
    fixture = TestBed.createComponent(FiltroMovimientosModalComponent);
    fixture.detectChanges();
  });

  it('excludes system categories from the category dropdown', async () => {
    await open();

    const trigger = native().querySelector<HTMLButtonElement>('#filtros-categoria');
    expect(trigger).not.toBeNull();
    expect(trigger?.getAttribute('role')).toBe('combobox');

    trigger!.click();
    fixture.detectChanges();

    const listbox = native().querySelector('[role="listbox"]');
    expect(listbox).not.toBeNull();

    const options = listbox?.querySelectorAll('[role="option"]') ?? [];
    expect(options.length).toBeGreaterThan(0);

    const optionTexts = Array.from(options).map((option) => option.textContent ?? '');
    expect(optionTexts.some((text) => text.includes('Transferencia'))).toBe(false);
    expect(optionTexts.some((text) => text.includes('Ajuste'))).toBe(false);
  });

  it('renders the note search input and every account type option', async () => {
    await open();

    const noteInput = native().querySelector<HTMLInputElement>('#filtros-nota');
    expect(noteInput).not.toBeNull();
    expect(noteInput?.type).toBe('text');

    const trigger = native().querySelector<HTMLButtonElement>('#filtros-tipo-cuenta');
    expect(trigger?.getAttribute('role')).toBe('combobox');

    trigger!.click();
    fixture.detectChanges();

    const listbox = native().querySelector('[role="listbox"]');
    const optionTexts = Array.from(listbox?.querySelectorAll('[role="option"]') ?? []).map(
      (option) => option.textContent ?? '',
    );

    expect(optionTexts.some((text) => text.includes('Todos los tipos'))).toBe(true);
    expect(optionTexts.some((text) => text.includes('Efectivo'))).toBe(true);
    expect(optionTexts.some((text) => text.includes('Débito'))).toBe(true);
    expect(optionTexts.some((text) => text.includes('Crédito'))).toBe(true);
    expect(optionTexts.some((text) => text.includes('Ahorros'))).toBe(true);
  });

  it('applies the note and account type filters', async () => {
    await open();

    setText('#filtros-nota', 'Renta');
    selectOption('#filtros-tipo-cuenta', 'Crédito');
    applyFilters();

    expect(movementsStore.filters().note).toBe('Renta');
    expect(movementsStore.filters().accountType).toBe('CREDIT');
    expect(movementsStore.activeFilterCount()).toBe(2);
  });

  it('hydrates the note and account type filters from the store', async () => {
    movementsStore.setFilters({note: 'Netflix', accountType: 'DEBIT'});
    await open();

    const noteInput = native().querySelector<HTMLInputElement>('#filtros-nota');
    expect(noteInput?.value).toBe('Netflix');

    const label = native().querySelector('#filtros-tipo-cuenta')?.textContent?.trim();
    expect(label).toContain('Débito');
  });
});
