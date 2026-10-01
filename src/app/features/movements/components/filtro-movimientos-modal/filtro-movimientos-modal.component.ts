import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {MOVEMENT_TYPE_LABEL} from '@core/constants';
import {AccountsStore} from '@core/stores/accounts.store';
import {CatalogStore} from '@core/stores/catalog.store';
import {MovementsStore} from '@core/stores/movements.store';
import {MovementFilterType} from '@core/types';
import {ModalComponent} from '@shared/components';

@Component({
  selector: 'app-filtro-movimientos-modal',
  imports: [ModalComponent],
  templateUrl: './filtro-movimientos-modal.component.html',
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
export class FiltroMovimientosModalComponent {
  readonly isOpen = input(false);

  readonly closed = output<void>();

  readonly accountsStore = inject(AccountsStore);
  readonly catalogStore = inject(CatalogStore);
  readonly movementsStore = inject(MovementsStore);

  readonly accounts = this.accountsStore.accounts;
  readonly categories = this.catalogStore.categories;

  readonly typeOptions: Array<{value: MovementFilterType; label: string}> = [
    {value: 'ALL', label: 'Todos'},
    {value: 'INCOME', label: MOVEMENT_TYPE_LABEL.INCOME},
    {value: 'EXPENSE', label: MOVEMENT_TYPE_LABEL.EXPENSE},
    {value: 'TRANSFER', label: MOVEMENT_TYPE_LABEL.TRANSFER},
  ];

  readonly type = signal<MovementFilterType>('ALL');
  readonly accountId = signal('');
  readonly categoryId = signal('');
  readonly hideReversals = signal(false);

  constructor() {
    effect(() => {
      if (!this.isOpen()) return;

      const filters = this.movementsStore.filters();
      this.type.set(filters.type);
      this.accountId.set(filters.accountId);
      this.categoryId.set(filters.categoryId);
      this.hideReversals.set(filters.hideReversals);
    });
  }

  apply(): void {
    this.movementsStore.setFilters({
      type: this.type(),
      accountId: this.accountId(),
      categoryId: this.categoryId(),
      hideReversals: this.hideReversals(),
    });
    this.closed.emit();
  }

  clear(): void {
    this.movementsStore.clearFilters();
    this.closed.emit();
  }
}
