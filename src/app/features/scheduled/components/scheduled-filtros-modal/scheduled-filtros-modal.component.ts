import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {CatalogStore} from '@core/stores/catalog.store';
import {ScheduledTransactionsStore} from '@core/stores/scheduled-transactions.store';
import {ModalComponent} from '@shared/components';

@Component({
  selector: 'app-scheduled-filtros-modal',
  imports: [ModalComponent, FormsModule],
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

  readonly categories = this.catalogStore.categories;

  readonly typeOptions: Array<{value: 'ALL' | 'INCOME' | 'EXPENSE'; label: string}> = [
    {value: 'ALL', label: 'Todos'},
    {value: 'INCOME', label: 'Ingresos'},
    {value: 'EXPENSE', label: 'Egresos'},
  ];

  readonly type = signal<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
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
