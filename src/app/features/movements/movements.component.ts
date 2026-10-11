import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {CurrencyPipe} from '@angular/common';
import {MovementsStore} from '@core/stores/movements.store';
import {calculateMovementTotals, isSameMonthAndYear} from '@core/utils';
import {
  AppIconComponent,
  MonthPickerBottomSheetComponent,
  MonthPickerSelection,
  MovementListComponent,
} from '@shared/components';
import {FiltroMovimientosModalComponent} from './components/filtro-movimientos-modal/filtro-movimientos-modal.component';

@Component({
  selector: 'app-movements',
  imports: [
    CurrencyPipe,
    MovementListComponent,
    FiltroMovimientosModalComponent,
    AppIconComponent,
    MonthPickerBottomSheetComponent,
  ],
  templateUrl: './movements.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MovementsComponent {
  readonly movementsStore = inject(MovementsStore);

  readonly filtersOpen = signal(false);

  readonly selectedPeriod = signal<MonthPickerSelection>({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });

  readonly isMonthPickerOpen = signal(false);

  readonly filteredMovements = computed(() =>
    this.movementsStore
      .filteredMovements()
      .filter((movement) => isSameMonthAndYear(movement.date, this.selectedPeriod())),
  );

  readonly filteredTotals = computed(() => calculateMovementTotals(this.filteredMovements()));

  readonly activeFilterCount = this.movementsStore.activeFilterCount;

  readonly minDate = computed(() => {
    const movements = this.movementsStore.sortedMovements();
    return movements.length > 0 ? movements[movements.length - 1].date : new Date().toISOString();
  });

  readonly maxDate = computed(() => new Date());

  readonly formattedSelectedMonthDesktop = computed(() => {
    const {month, year} = this.selectedPeriod();
    const monthName = new Intl.DateTimeFormat('es-ES', {month: 'long'}).format(
      new Date(year, month - 1, 1),
    );
    return `${monthName.charAt(0).toUpperCase()}${monthName.slice(1)} ${year}`;
  });

  readonly formattedSelectedMonthMobile = computed(() => {
    const {month, year} = this.selectedPeriod();
    return `${String(month).padStart(2, '0')} / ${year}`;
  });

  toggleMonthPicker(): void {
    this.isMonthPickerOpen.update((isOpen) => !isOpen);
  }

  closeMonthPicker(): void {
    this.isMonthPickerOpen.set(false);
  }

  onMonthSelected(selection: MonthPickerSelection): void {
    this.selectedPeriod.set({month: selection.month, year: selection.year});
    this.isMonthPickerOpen.set(false);
  }
}
