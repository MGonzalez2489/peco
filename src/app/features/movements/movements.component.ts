import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {CurrencyPipe} from '@angular/common';
import {MOVEMENT_TYPE_LABEL, MOVEMENT_TYPE_PALETTE} from '@core/constants';
import {Movement} from '@core/models';
import {FINANCE_STORAGE} from '@core/services/finance-storage.interface';
import {MovementType} from '@core/types';
import {reversalImpact} from '@core/utils';
import {ConfirmModalComponent} from '@shared/components/confirm-modal/confirm-modal.component';
import {FiltroMovimientosModalComponent} from './components/filtro-movimientos-modal/filtro-movimientos-modal.component';
import {
  GrupoMovimientos,
  MovementFilterType,
  MovementFilters,
} from './models/movement-filters.model';

@Component({
  selector: 'app-movements',
  imports: [CurrencyPipe, ConfirmModalComponent, FiltroMovimientosModalComponent],
  templateUrl: './movements.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MovementsComponent {
  readonly storage = inject(FINANCE_STORAGE);

  readonly categories = this.storage.categories;

  readonly typeFilter = signal<MovementFilterType>('ALL');
  readonly categoryFilter = signal('');
  readonly hideReversals = signal(false);

  readonly filtersOpen = signal(false);

  readonly movementToRevert = signal<Movement | null>(null);

  readonly filterOptions: Array<{value: MovementFilterType; label: string}> = [
    {value: 'ALL', label: 'Todos'},
    {value: 'INCOME', label: MOVEMENT_TYPE_LABEL.INCOME},
    {value: 'EXPENSE', label: MOVEMENT_TYPE_LABEL.EXPENSE},
    {value: 'TRANSFER', label: MOVEMENT_TYPE_LABEL.TRANSFER},
  ];

  readonly currentFilters = computed<MovementFilters>(() => ({
    type: this.typeFilter(),
    categoryId: this.categoryFilter(),
    hideReversals: this.hideReversals(),
  }));

  readonly activeFilterCount = computed(() => {
    let count = 0;
    if (this.typeFilter() !== 'ALL') count += 1;
    if (this.categoryFilter()) count += 1;
    if (this.hideReversals()) count += 1;
    return count;
  });

  readonly filteredMovements = computed(() =>
    [...this.storage.movements()]
      .sort((a, b) => b.date.localeCompare(a.date))
      .filter((movement) => {
        const matchesType = this.typeFilter() === 'ALL' || movement.type === this.typeFilter();
        const matchesCategory =
          !this.categoryFilter() ||
          movement.categoryId === this.categoryFilter() ||
          movement.destinationCategoryId === this.categoryFilter();
        const matchesReversal =
          !this.hideReversals() || (!movement.isReversal && !movement.reversalId);
        return matchesType && matchesCategory && matchesReversal;
      }),
  );

  readonly movimientosAgrupados = computed<GrupoMovimientos[]>(() => {
    const groups: GrupoMovimientos[] = [];
    for (const movement of this.filteredMovements()) {
      const fecha = this.parseLocalDate(movement.date);
      const last = groups[groups.length - 1];
      if (last && last.fecha === fecha) {
        last.movimientos.push(movement);
      } else {
        groups.push({fecha, movimientos: [movement]});
      }
    }
    return groups;
  });

  readonly impactMessage = computed(() => {
    const movement = this.movementToRevert();
    if (!movement) return '';
    return reversalImpact(
      movement,
      this.categoryName(movement.categoryId),
      movement.destinationCategoryId
        ? this.categoryName(movement.destinationCategoryId)
        : undefined,
    );
  });

  private readonly categoriesById = computed(
    () => new Map(this.categories().map((category) => [category.id, category])),
  );

  readonly typeLabel = (type: MovementType) => MOVEMENT_TYPE_LABEL[type];
  readonly movementSign = (type: MovementType) => MOVEMENT_TYPE_PALETTE[type].sign;
  readonly movementPalette = (type: MovementType) => MOVEMENT_TYPE_PALETTE[type];

  readonly categoryName = (id: string): string =>
    this.categoriesById().get(id)?.name ?? 'Unknown category';

  readonly categoryInitial = (id: string): string =>
    this.categoriesById().get(id)?.name?.charAt(0).toUpperCase() ?? '?';

  readonly movementTime = (movement: Movement): string => {
    const [, time] = movement.date.split('T');
    if (!time) return '';
    const [rawHours, minutes] = time.slice(0, 5).split(':').map(Number);
    const suffix = rawHours >= 12 ? 'PM' : 'AM';
    const hours = rawHours % 12 === 0 ? 12 : rawHours % 12;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${suffix}`;
  };

  applyFilters(filters: MovementFilters): void {
    this.typeFilter.set(filters.type);
    this.categoryFilter.set(filters.categoryId);
    this.hideReversals.set(filters.hideReversals);
  }

  proceedToRevert(): void {
    const movement = this.movementToRevert();
    if (movement) {
      this.storage.revertMovement(movement.id);
    }
    this.movementToRevert.set(null);
  }

  cancelRevert(): void {
    this.movementToRevert.set(null);
  }

  private parseLocalDate(iso: string): string {
    const [year, month, day] = iso.split('T')[0].split('-').map(Number);
    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
  }
}
