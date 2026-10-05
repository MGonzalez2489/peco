import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {CurrencyPipe} from '@angular/common';
import {MovementsStore} from '@core/stores/movements.store';
import {FiltroMovimientosModalComponent} from './components/filtro-movimientos-modal/filtro-movimientos-modal.component';
import {MovementListComponent} from '@shared/components';
import {AppIconComponent} from '@shared/components/app-icon/app-icon.component';

@Component({
  selector: 'app-movements',
  imports: [CurrencyPipe, MovementListComponent, FiltroMovimientosModalComponent, AppIconComponent],
  templateUrl: './movements.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MovementsComponent {
  readonly movementsStore = inject(MovementsStore);

  readonly filteredMovements = this.movementsStore.filteredMovements;
  readonly filteredTotals = this.movementsStore.filteredTotals;
  readonly activeFilterCount = this.movementsStore.activeFilterCount;

  readonly filtersOpen = signal(false);
}
