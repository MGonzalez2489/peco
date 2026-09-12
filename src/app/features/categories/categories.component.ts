import {Component, inject, signal} from '@angular/core';
import {RouterLink} from '@angular/router';
import {FINANCE_STORAGE} from '../../core/services/finance-storage.interface';
import {StatCardComponent} from '../../shared/components/stat-card/stat-card.component';
import {CategoryFormModalComponent} from './components/category-form-modal.component';
import {formatCurrency} from '../../core/models/finance.model';

@Component({
  selector: 'app-categories',
  imports: [RouterLink, StatCardComponent, CategoryFormModalComponent],
  templateUrl: './categories.component.html',
})
export class CategoriesComponent {
  readonly storage = inject(FINANCE_STORAGE);

  readonly categories = this.storage.categories;

  readonly modalOpen = signal(false);

  readonly categorySubtext = (targetGoal: number | undefined): string =>
    targetGoal !== undefined ? `Meta ${formatCurrency(targetGoal)}` : 'Sin meta asignada';
}
