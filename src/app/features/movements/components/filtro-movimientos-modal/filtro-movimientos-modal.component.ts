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
import {Category} from '@core/models';
import {MovementFilterType} from '../../models/movement-filters.model';
import {ModalComponent} from '@shared/components';

@Component({
  selector: 'app-filtro-movimientos-modal',
  imports: [ModalComponent],
  templateUrl: './filtro-movimientos-modal.component.html',
  standalone: true,
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
  readonly categories = input<readonly Category[]>([]);
  readonly filters = input({
    type: 'ALL' as MovementFilterType,
    categoryId: '',
    hideReversals: false,
  });

  readonly filtersChanged = output<{
    type: MovementFilterType;
    categoryId: string;
    hideReversals: boolean;
  }>();
  readonly closed = output<void>();

  readonly typeOptions: Array<{value: MovementFilterType; label: string}> = [
    {value: 'ALL', label: 'Todos'},
    {value: 'INCOME', label: MOVEMENT_TYPE_LABEL.INCOME},
    {value: 'EXPENSE', label: MOVEMENT_TYPE_LABEL.EXPENSE},
    {value: 'TRANSFER', label: MOVEMENT_TYPE_LABEL.TRANSFER},
  ];

  readonly type = signal<MovementFilterType>('ALL');
  readonly categoryId = signal('');
  readonly hideReversals = signal(false);

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        this.type.set(this.filters().type);
        this.categoryId.set(this.filters().categoryId);
        this.hideReversals.set(this.filters().hideReversals);
      }
    });
  }

  apply(): void {
    this.filtersChanged.emit({
      type: this.type(),
      categoryId: this.categoryId(),
      hideReversals: this.hideReversals(),
    });
    this.closed.emit();
  }

  clear(): void {
    this.filtersChanged.emit({type: 'ALL', categoryId: '', hideReversals: false});
    this.closed.emit();
  }
}
