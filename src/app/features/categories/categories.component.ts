import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {FINANCE_STORAGE} from '@core/services/finance-storage.interface';
import {CategoryCardComponent} from './components/category-card.component';
import {CategoryFormModalComponent} from './components/category-form-modal.component';

@Component({
  selector: 'app-categories',
  imports: [CategoryCardComponent, CategoryFormModalComponent],
  templateUrl: './categories.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoriesComponent {
  readonly storage = inject(FINANCE_STORAGE);

  readonly categories = this.storage.categories;

  readonly modalOpen = signal(false);
}
