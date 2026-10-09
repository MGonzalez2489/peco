import {CurrencyPipe} from '@angular/common';
import {ChangeDetectionStrategy, Component, computed, inject, input, signal} from '@angular/core';
import {MOVEMENT_TYPE_LABEL, MOVEMENT_TYPE_PALETTE} from '@core/constants';
import {Movement} from '@core/models';
import {AccountsStore} from '@core/stores/accounts.store';
import {CatalogStore} from '@core/stores/catalog.store';
import {MovementsStore} from '@core/stores/movements.store';
import {MovementType} from '@core/types';
import {accountColor, groupMovementsByDate, reversalImpact, toSoftCategoryColor} from '@core/utils';
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

  readonly accountName = (id: string): string => this.accountsById().get(id)?.name ?? 'Sin cuenta';

  readonly accountDotColor = (id: string): string =>
    accountColor(this.accountsById().get(id)?.color).chip;

  readonly categoryName = (movement: Movement): string => {
    const category = this.categoriesById().get(movement.categoryId);
    return category ? category.displayName : MOVEMENT_TYPE_LABEL[movement.type];
  };

  readonly categoryIcon = (movement: Movement): IconName =>
    this.categoriesById().get(movement.categoryId)?.icon ?? 'folder-open';

  readonly categoryColor = (movement: Movement): string =>
    this.categoriesById().get(movement.categoryId)?.color ?? FALLBACK_CATEGORY_COLOR;

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
      this.movementsStore.revertMovement(movement.id);
    }
    this.movementToRevert.set(null);
  }

  cancelRevert(): void {
    this.movementToRevert.set(null);
  }
}
