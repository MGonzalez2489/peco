import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MOVEMENT_TYPE_LABEL} from '@core/constants';
import {SelectOption} from '@core/models';
import {CatalogStore} from '@core/stores/catalog.store';
import {ScheduledTransactionsStore} from '@core/stores/scheduled-transactions.store';
import {MovementFilterType} from '@core/types';
import {toCategoryOption} from '@core/utils';
import {AppSelectComponent, ModalComponent} from '@shared/components';

@Component({
  selector: 'app-scheduled-filtros-modal',
  imports: [ModalComponent, FormsModule, AppSelectComponent],
  templateUrl: './scheduled-filtros-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: contents;
    }

    .slide-up {
      animation: filtros-slide-up 240ms cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes filtros-slide-up {
      from {
        opacity: 0;
        transform: translateY(24px);
      }
      to {
        opacity: 1;
        transform: none;
      }
    }
  `,
})
export class ScheduledFiltrosModalComponent {
  readonly isOpen = input(false);

  readonly closed = output<void>();

  readonly catalogStore = inject(CatalogStore);
  readonly scheduledStore = inject(ScheduledTransactionsStore);

  readonly categories = this.catalogStore.filterableCategories;

  readonly categoryOptions = computed<SelectOption[]>(() => [
    {value: '', label: 'Todas las categorías'},
    ...this.categories().map((category) => toCategoryOption(category)),
  ]);

  readonly typeOptions: Array<{value: MovementFilterType; label: string}> = [
    {value: 'ALL', label: 'Todos'},
    {value: 'INCOME', label: 'Ingresos'},
    {value: 'EXPENSE', label: 'Egresos'},
    {value: 'TRANSFER', label: MOVEMENT_TYPE_LABEL.TRANSFER},
  ];

  readonly type = signal<MovementFilterType>('ALL');
  readonly categoryId = signal<string | null>(null);
  readonly searchQuery = signal('');

  constructor() {
    effect(() => {
      if (!this.isOpen()) return;

      this.type.set(this.scheduledStore.typeFilter());
      this.categoryId.set(this.scheduledStore.selectedCategoryId());
      this.searchQuery.set(this.scheduledStore.searchQuery());
    });
  }

  apply(): void {
    this.scheduledStore.setSearchQuery(this.searchQuery());
    this.scheduledStore.setTypeFilter(this.type());
    this.scheduledStore.setCategoryFilter(this.categoryId());
    this.closed.emit();
  }

  clear(): void {
    this.scheduledStore.resetFilters();
    this.closed.emit();
  }
}
