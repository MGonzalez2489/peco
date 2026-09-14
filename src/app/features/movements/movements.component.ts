import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {FINANCE_STORAGE} from '@core/services/finance-storage.interface';
import {MovementListComponent} from '@shared/components';
import {FiltroMovimientosModalComponent} from './components/filtro-movimientos-modal/filtro-movimientos-modal.component';
import {MovementFilterType, MovementFilters} from './models/movement-filters.model';

@Component({
  selector: 'app-movements',
  imports: [MovementListComponent, FiltroMovimientosModalComponent],
  templateUrl: './movements.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MovementsComponent {
  readonly storage = inject(FINANCE_STORAGE);

  readonly accounts = this.storage.accounts;
  readonly categories = this.storage.categories;

  readonly typeFilter = signal<MovementFilterType>('ALL');
  readonly accountFilter = signal('');
  readonly categoryFilter = signal('');
  readonly hideReversals = signal(false);

  readonly filtersOpen = signal(false);

  readonly currentFilters = computed<MovementFilters>(() => ({
    type: this.typeFilter(),
    accountId: this.accountFilter(),
    categoryId: this.categoryFilter(),
    hideReversals: this.hideReversals(),
  }));

  readonly activeFilterCount = computed(() => {
    let count = 0;
    if (this.typeFilter() !== 'ALL') count += 1;
    if (this.accountFilter()) count += 1;
    if (this.categoryFilter()) count += 1;
    if (this.hideReversals()) count += 1;
    return count;
  });

  readonly filteredMovements = computed(() =>
    [...this.storage.movements()]
      .sort((a, b) => b.date.localeCompare(a.date))
      .filter((movement) => {
        const matchesType = this.typeFilter() === 'ALL' || movement.type === this.typeFilter();
        const matchesAccount =
          !this.accountFilter() ||
          movement.accountId === this.accountFilter() ||
          movement.targetAccountId === this.accountFilter();
        const matchesCategory =
          !this.categoryFilter() || movement.categoryId === this.categoryFilter();
        const matchesReversal =
          !this.hideReversals() || (!movement.isReversal && !movement.reversalId);
        return matchesType && matchesAccount && matchesCategory && matchesReversal;
      }),
  );

  applyFilters(filters: MovementFilters): void {
    this.typeFilter.set(filters.type);
    this.accountFilter.set(filters.accountId);
    this.categoryFilter.set(filters.categoryId);
    this.hideReversals.set(filters.hideReversals);
  }
}
