import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {Movement} from '@core/models';
import {GlobalPeriodStore} from '@core/stores/global-period.store';
import {MovementsStore} from '@core/stores/movements.store';
import {calculateMovementTotals, toPeriod} from '@core/utils';
import {AppIconComponent, MovementListComponent} from '@shared/components';
import {PrivacyCurrencyPipe} from '@shared/pipes/privacy-currency.pipe';
import {FiltroMovimientosModalComponent} from './components/filtro-movimientos-modal/filtro-movimientos-modal.component';
import {MovementDetailModalComponent} from './components/movement-detail-modal/movement-detail-modal.component';
import {MovementFormModalComponent} from './components/movement-form-modal.component';
import {MovementsProgressionChartComponent} from './components/movements-progression-chart/movements-progression-chart.component';

@Component({
  selector: 'app-movements',
  imports: [
    PrivacyCurrencyPipe,
    MovementListComponent,
    MovementDetailModalComponent,
    MovementFormModalComponent,
    FiltroMovimientosModalComponent,
    MovementsProgressionChartComponent,
    AppIconComponent,
  ],
  templateUrl: './movements.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MovementsComponent {
  readonly movementsStore = inject(MovementsStore);
  private readonly globalPeriodStore = inject(GlobalPeriodStore);

  readonly filtersOpen = signal(false);

  readonly selectedMovement = signal<Movement | null>(null);

  readonly isMovementDetailOpen = computed(() => this.selectedMovement() !== null);

  readonly editingMovement = signal<Movement | null>(null);

  readonly isEditFormOpen = computed(() => this.editingMovement() !== null);

  readonly selectedPeriodKey = this.globalPeriodStore.selectedPeriodKey;
  readonly isPastPeriod = this.globalPeriodStore.isPastPeriod;

  readonly selectedPeriod = computed(() => ({
    month: this.globalPeriodStore.selectedMonth(),
    year: this.globalPeriodStore.selectedYear(),
  }));

  readonly filteredMovements = computed(() =>
    this.movementsStore
      .filteredMovements()
      .filter((movement) => toPeriod(movement.date) === this.selectedPeriodKey()),
  );

  readonly filteredTotals = computed(() => calculateMovementTotals(this.filteredMovements()));

  readonly activeFilterCount = this.movementsStore.activeFilterCount;

  openMovementDetail(movement: Movement): void {
    this.selectedMovement.set(movement);
  }

  closeMovementDetail(): void {
    this.selectedMovement.set(null);
  }

  openEditMovement(movement: Movement): void {
    if (this.isPastPeriod()) return;

    this.selectedMovement.set(null);
    this.editingMovement.set(movement);
  }

  closeEditMovement(): void {
    this.editingMovement.set(null);
  }
}
