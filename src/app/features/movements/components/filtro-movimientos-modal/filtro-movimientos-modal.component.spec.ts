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
});
