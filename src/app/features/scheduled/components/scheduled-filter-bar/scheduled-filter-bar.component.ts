import {ChangeDetectionStrategy, Component, effect, inject, output, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {ScheduledTransactionsStore} from '@core/stores/scheduled-transactions.store';
import {CatalogStore} from '@core/stores/catalog.store';
import {AppIconComponent} from '@shared/components';

@Component({
  selector: 'app-scheduled-filter-bar',
  imports: [FormsModule, AppIconComponent],
  templateUrl: './scheduled-filter-bar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduledFilterBarComponent {
  readonly scheduledStore = inject(ScheduledTransactionsStore);
  readonly catalogStore = inject(CatalogStore);

  readonly searchChanged = output<string>();
  readonly typeFilterChanged = output<'ALL' | 'INCOME' | 'EXPENSE'>();
  readonly categorySelected = output<string | null>();

  readonly searchQueryLocal = signal(this.scheduledStore.searchQuery());

  constructor() {
    effect(() => {
      const storeQuery = this.scheduledStore.searchQuery();
      if (storeQuery !== this.searchQueryLocal()) {
        this.searchQueryLocal.set(storeQuery);
      }
    });
  }

  onSearchInput(): void {
    this.searchChanged.emit(this.searchQueryLocal());
  }

  setTypeFilter(type: 'ALL' | 'INCOME' | 'EXPENSE'): void {
    this.typeFilterChanged.emit(type);
  }

  setCategoryFilter(categoryId: string | null): void {
    this.categorySelected.emit(categoryId);
  }

  resetFilters(): void {
    this.searchQueryLocal.set('');
    this.searchChanged.emit('');
    this.typeFilterChanged.emit('ALL');
    this.categorySelected.emit(null);
  }
}
