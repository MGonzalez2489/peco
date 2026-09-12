import {formatCurrency} from '@core/utils';
import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {RouterLink} from '@angular/router';
import {FINANCE_STORAGE} from '@core/services/finance-storage.interface';
import {StatCardComponent} from '@shared/components';
import {CategoryFormModalComponent} from './components/category-form-modal.component';

@Component({
  selector: 'app-categories',
  imports: [RouterLink, StatCardComponent, CategoryFormModalComponent],
  templateUrl: './categories.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoriesComponent {
  readonly storage = inject(FINANCE_STORAGE);

  readonly categories = this.storage.categories;

  readonly modalOpen = signal(false);

  readonly categorySubtext = (targetGoal: number | undefined): string =>
    targetGoal !== undefined ? `Meta ${formatCurrency(targetGoal)}` : 'Sin meta asignada';
}
