import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';
import {RouterLink} from '@angular/router';
import {Category} from '@core/models';
import {FINANCE_STORAGE} from '@core/services/finance-storage.interface';
import {formatCurrency} from '@core/utils';
import {StatCardComponent} from '@shared/components/stat-card/stat-card.component';

@Component({
  selector: 'app-category-card',
  imports: [RouterLink, StatCardComponent],
  templateUrl: './category-card.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryCardComponent {
  readonly category = input.required<Category>();

  readonly storage = inject(FINANCE_STORAGE);

  readonly pinned = computed(() => this.category().pinToHome ?? false);

  readonly subtext = computed(() => {
    const goal = this.category().targetGoal;
    return goal !== undefined ? `Meta ${formatCurrency(goal)}` : 'Sin meta asignada';
  });

  togglePin(): void {
    const category = this.category();
    this.storage.updateCategory(category.id, {
      name: category.name,
      initialBalance: category.currentBalance,
      targetGoal: category.targetGoal,
      color: category.color,
      icon: category.icon,
      pinToHome: !this.pinned(),
    });
  }
}
