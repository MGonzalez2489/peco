import {Component, computed, inject} from '@angular/core';
import {RouterLink} from '@angular/router';
import {CurrencyPipe, DatePipe} from '@angular/common';
import {FINANCE_STORAGE} from '../../core/services/finance-storage.interface';
import {StatCardComponent} from '../../shared/components/stat-card/stat-card.component';
import {
  Category,
  MovementType,
  MOVEMENT_TYPE_PALETTE,
  MOVEMENT_TYPE_LABEL,
  formatCurrency,
} from '../../core/models/finance.model';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, StatCardComponent, CurrencyPipe, DatePipe],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent {
  readonly storage = inject(FINANCE_STORAGE);

  readonly categories = this.storage.categories;
  readonly totalBalance = this.storage.totalBalance;

  readonly recentMovements = computed(() =>
    [...this.storage.movements()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
  );

  private readonly categoriesById = computed(
    () => new Map(this.categories().map((category) => [category.id, category])),
  );

  readonly typeLabel = (type: MovementType) => MOVEMENT_TYPE_LABEL[type];
  readonly movementSign = (type: MovementType) => MOVEMENT_TYPE_PALETTE[type].sign;
  readonly movementPalette = (type: MovementType) => MOVEMENT_TYPE_PALETTE[type];

  readonly categoryName = (id: string): string =>
    this.categoriesById().get(id)?.name ?? 'Sin categoría';

  readonly categoryInitial = (id: string): string =>
    this.categoriesById().get(id)?.name?.charAt(0).toUpperCase() ?? '?';

  readonly categorySubtext = (category: Category): string =>
    category.targetGoal !== undefined
      ? `Meta ${formatCurrency(category.targetGoal)}`
      : 'Sin meta asignada';
}
