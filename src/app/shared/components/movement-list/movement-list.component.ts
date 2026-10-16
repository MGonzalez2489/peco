import {CurrencyPipe} from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {MOVEMENT_TYPE_LABEL, MOVEMENT_TYPE_PALETTE, MOVEMENT_TYPES} from '@core/constants';
import {Movement} from '@core/models';
import {AccountsStore} from '@core/stores/accounts.store';
import {CatalogStore} from '@core/stores/catalog.store';
import {MovementsStore} from '@core/stores/movements.store';
import {MovementType} from '@core/types';
import {
  accountColor,
  formatLocalTime,
  groupMovementsByDate,
  reversalImpact,
  toSoftCategoryColor,
} from '@core/utils';
import {ConfirmModalComponent} from '../confirm-modal/confirm-modal.component';

import {AppIconComponent, IconName} from '../app-icon/app-icon.component';

const FALLBACK_CATEGORY_COLOR = '#94a3b8';

@Component({
  selector: 'app-movement-list',
  imports: [CurrencyPipe, ConfirmModalComponent, AppIconComponent],
  templateUrl: './movement-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MovementListComponent {
  readonly movements = input<readonly Movement[]>([]);
  readonly emptyMessage = input('No hay movimientos para mostrar.');
  readonly selectable = input(false);

  readonly movementSelected = output<Movement>();

  readonly accountsStore = inject(AccountsStore);
  readonly catalogStore = inject(CatalogStore);
  readonly movementsStore = inject(MovementsStore);

  readonly movementToRevert = signal<Movement | null>(null);

  private readonly accountsById = computed(
    () => new Map(this.accountsStore.accounts().map((account) => [account.id, account])),
  );

  private readonly categoriesById = computed(
    () => new Map(this.catalogStore.categories().map((category) => [category.id, category])),
  );

  readonly movimientosAgrupados = computed(() => groupMovementsByDate(this.movements()));

  readonly softCategoryColor = toSoftCategoryColor;

  readonly impactMessage = computed(() => {
    const movement = this.movementToRevert();
    if (!movement) return '';
    return reversalImpact(
      movement,
      this.accountName(movement.accountId),
      movement.targetAccountId ? this.accountName(movement.targetAccountId) : undefined,
    );
  });

  readonly typeLabel = (type: MovementType) => MOVEMENT_TYPE_LABEL[type];
  readonly movementSign = (type: MovementType) => MOVEMENT_TYPE_PALETTE[type].sign;
  readonly movementPalette = (type: MovementType) => MOVEMENT_TYPE_PALETTE[type];

  private readonly movementTypesByKey = computed(
    () => new Map(MOVEMENT_TYPES.map((type) => [type.key, type])),
  );

  readonly accountName = (id: string): string => this.accountsById().get(id)?.name ?? 'Sin cuenta';

  readonly movementTypeIcon = (type: MovementType): IconName =>
    this.movementTypesByKey().get(type)?.icon ?? 'arrow-left-right';

  readonly movementTypeColor = (type: MovementType): string =>
    accountColor(this.movementTypesByKey().get(type)?.color).chip;

  readonly movementTypeBackground = (type: MovementType): string =>
    toSoftCategoryColor(this.movementTypeColor(type), '20');

  readonly categoryName = (movement: Movement): string => {
    const category = this.categoriesById().get(movement.categoryId);
    return category ? category.displayName : MOVEMENT_TYPE_LABEL[movement.type];
  };

  readonly categoryIcon = (movement: Movement): IconName =>
    this.categoriesById().get(movement.categoryId)?.icon ?? 'folder-open';

  readonly categoryColor = (movement: Movement): string =>
    this.categoriesById().get(movement.categoryId)?.color ?? FALLBACK_CATEGORY_COLOR;

  readonly movementTime = (movement: Movement): string => formatLocalTime(movement.date);

  selectMovement(movement: Movement): void {
    if (this.selectable()) {
      this.movementSelected.emit(movement);
    }
  }

  proceedToRevert(): void {
    const movement = this.movementToRevert();
    if (movement) {
      this.movementsStore.revertMovement(movement.id);
    }
    this.movementToRevert.set(null);
  }

  cancelRevert(): void {
    this.movementToRevert.set(null);
  }
}
