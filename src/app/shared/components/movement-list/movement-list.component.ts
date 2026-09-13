import {CurrencyPipe} from '@angular/common';
import {ChangeDetectionStrategy, Component, computed, inject, input, signal} from '@angular/core';
import {MOVEMENT_TYPE_LABEL, MOVEMENT_TYPE_PALETTE} from '@core/constants';
import {Movement} from '@core/models';
import {FINANCE_STORAGE} from '@core/services/finance-storage.interface';
import {MovementType} from '@core/types';
import {reversalImpact} from '@core/utils';
import {ConfirmModalComponent} from '../confirm-modal/confirm-modal.component';
import {GrupoMovimientos} from './movement-list.types';

@Component({
  selector: 'app-movement-list',
  imports: [CurrencyPipe, ConfirmModalComponent],
  templateUrl: './movement-list.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MovementListComponent {
  readonly movements = input<readonly Movement[]>([]);
  readonly emptyMessage = input('No hay movimientos para mostrar.');

  readonly storage = inject(FINANCE_STORAGE);

  readonly movementToRevert = signal<Movement | null>(null);

  private readonly categoriesById = computed(
    () => new Map(this.storage.categories().map((category) => [category.id, category])),
  );

  readonly movimientosAgrupados = computed<GrupoMovimientos[]>(() => {
    const groups: GrupoMovimientos[] = [];
    for (const movement of this.movements()) {
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

  readonly typeLabel = (type: MovementType) => MOVEMENT_TYPE_LABEL[type];
  readonly movementSign = (type: MovementType) => MOVEMENT_TYPE_PALETTE[type].sign;
  readonly movementPalette = (type: MovementType) => MOVEMENT_TYPE_PALETTE[type];

  readonly categoryName = (id: string): string =>
    this.categoriesById().get(id)?.name ?? 'Sin categoría';

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
