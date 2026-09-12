import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {CurrencyPipe, DatePipe} from '@angular/common';
import {MOVEMENT_TYPE_LABEL, MOVEMENT_TYPE_PALETTE} from '@core/constants';
import {Movement} from '@core/models';
import {FINANCE_STORAGE} from '@core/services/finance-storage.interface';
import {MovementType} from '@core/types';
import {reversalImpact} from '@core/utils';
import {ConfirmModalComponent} from '@shared/components';

type MovementFilter = 'ALL' | MovementType;

@Component({
  selector: 'app-movements',
  imports: [CurrencyPipe, DatePipe, ConfirmModalComponent],
  templateUrl: './movements.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MovementsComponent {
  readonly storage = inject(FINANCE_STORAGE);

  readonly categories = this.storage.categories;

  readonly typeFilter = signal<MovementFilter>('ALL');
  readonly categoryFilter = signal('');

  readonly movementToRevert = signal<Movement | null>(null);

  readonly filterOptions: Array<{value: MovementFilter; label: string}> = [
    {value: 'ALL', label: 'Todos'},
    {value: 'INCOME', label: MOVEMENT_TYPE_LABEL.INCOME},
    {value: 'EXPENSE', label: MOVEMENT_TYPE_LABEL.EXPENSE},
    {value: 'TRANSFER', label: MOVEMENT_TYPE_LABEL.TRANSFER},
  ];

  readonly filteredMovements = computed(() => {
    const typeFilter = this.typeFilter();
    const categoryFilter = this.categoryFilter();

    return [...this.storage.movements()]
      .sort((a, b) => b.date.localeCompare(a.date))
      .filter((movement) => {
        const matchesType = typeFilter === 'ALL' || movement.type === typeFilter;
        const matchesCategory =
          !categoryFilter ||
          movement.categoryId === categoryFilter ||
          movement.destinationCategoryId === categoryFilter;
        return matchesType && matchesCategory;
      });
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
}
