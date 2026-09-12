import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import {ActivatedRoute, RouterLink, Router} from '@angular/router';
import {CurrencyPipe, DatePipe} from '@angular/common';
import {toSignal} from '@angular/core/rxjs-interop';
import {map} from 'rxjs';
import {MOVEMENT_TYPE_LABEL, MOVEMENT_TYPE_PALETTE} from '@core/constants';
import {Movement, Category} from '@core/models';
import {FINANCE_STORAGE} from '@core/services/finance-storage.interface';
import {MovementType} from '@core/types';
import {formatCurrency, reversalImpact} from '@core/utils';
import {StatCardComponent, ConfirmModalComponent} from '@shared/components';
import {CategoryFormModalComponent} from '../components/category-form-modal.component';

@Component({
  selector: 'app-category-detail',
  imports: [
    RouterLink,
    CurrencyPipe,
    DatePipe,
    StatCardComponent,
    ConfirmModalComponent,
    CategoryFormModalComponent,
  ],
  templateUrl: './category-detail.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryDetailComponent {
  readonly storage = inject(FINANCE_STORAGE);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly id = toSignal(this.route.paramMap.pipe(map((params) => params.get('id') ?? '')));

  readonly category = computed(() =>
    this.storage.categories().find((category) => category.id === this.id()),
  );

  readonly editOpen = signal(false);

  readonly movementToRevert = signal<Movement | null>(null);
  readonly categoryToDelete = signal<Category | null>(null);

  readonly transferDestination = linkedSignal<Category | null, string>({
    source: this.categoryToDelete,
    computation: (category) => {
      if (!category || category.currentBalance === 0) return '';
      return this.otherCategories()[0]?.id ?? '';
    },
  });

  readonly otherCategories = computed(() =>
    this.storage.categories().filter((category) => category.id !== this.id()),
  );

  readonly categoryMovements = computed(() =>
    [...this.storage.movements()]
      .filter(
        (movement) =>
          movement.categoryId === this.id() || movement.destinationCategoryId === this.id(),
      )
      .sort((a, b) => b.date.localeCompare(a.date)),
  );

  readonly movementImpactMessage = computed(() => {
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

  readonly categoryDeletionMessage = computed(() => {
    const category = this.categoryToDelete();
    if (!category) return '';
    if (category.currentBalance === 0) {
      return `La cuenta "${category.name}" se eliminará junto con su historial. ¿Deseas continuar?`;
    }
    return `La cuenta "${category.name}" tiene un saldo de ${formatCurrency(category.currentBalance)}. Se creará una transferencia automática y luego se eliminará.`;
  });

  readonly categorySubtext = (targetGoal: number | undefined): string =>
    targetGoal !== undefined ? `Meta ${formatCurrency(targetGoal)}` : 'Sin meta asignada';

  readonly formatCurrency = formatCurrency;

  readonly typeLabel = (type: MovementType) => MOVEMENT_TYPE_LABEL[type];

  readonly categoryName = (id: string): string =>
    this.storage.categories().find((category) => category.id === id)?.name ?? 'Sin categoría';

  readonly isDestination = (movement: Movement): boolean =>
    movement.type === 'TRANSFER' &&
    !!movement.destinationCategoryId &&
    movement.destinationCategoryId === this.id() &&
    movement.categoryId !== this.id();

  readonly getLabel = (movement: Movement): string =>
    movement.type === 'TRANSFER'
      ? `${this.categoryName(movement.categoryId)} → ${this.categoryName(movement.destinationCategoryId ?? '')}`
      : this.categoryName(movement.categoryId);

  readonly getInitial = (movement: Movement): string =>
    this.categoryName(
      this.isDestination(movement) ? movement.destinationCategoryId! : movement.categoryId,
    )
      .charAt(0)
      .toUpperCase();

  readonly signOf = (movement: Movement): string => {
    if (this.isDestination(movement) || movement.type === 'INCOME') return '+';
    return movement.type === 'EXPENSE' ? '-' : '';
  };

  readonly paletteOf = (movement: Movement) =>
    this.isDestination(movement)
      ? MOVEMENT_TYPE_PALETTE.INCOME
      : MOVEMENT_TYPE_PALETTE[movement.type];

  proceedToRevertMovement(): void {
    const movement = this.movementToRevert();
    if (movement) {
      this.storage.revertMovement(movement.id);
    }
    this.movementToRevert.set(null);
  }

  cancelRevertMovement(): void {
    this.movementToRevert.set(null);
  }

  proceedToDeleteCategory(): void {
    const category = this.categoryToDelete();
    if (!category) return;

    if (category.currentBalance !== 0) {
      const destination = this.transferDestination();
      if (!destination || destination === category.id) return;
      this.storage.deleteCategory(category.id, destination);
    } else {
      this.storage.deleteCategory(category.id);
    }

    this.categoryToDelete.set(null);
    void this.router.navigate(['/categories']);
  }

  cancelDeleteCategory(): void {
    this.categoryToDelete.set(null);
  }
}
