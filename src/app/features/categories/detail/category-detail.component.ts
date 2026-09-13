import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {toSignal} from '@angular/core/rxjs-interop';
import {map} from 'rxjs';
import {Category} from '@core/models';
import {FINANCE_STORAGE} from '@core/services/finance-storage.interface';
import {formatCurrency} from '@core/utils';
import {ConfirmModalComponent, MovementListComponent, StatCardComponent} from '@shared/components';
import {CategoryFormModalComponent} from '../components/category-form-modal.component';

@Component({
  selector: 'app-category-detail',
  imports: [
    RouterLink,
    StatCardComponent,
    ConfirmModalComponent,
    MovementListComponent,
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
