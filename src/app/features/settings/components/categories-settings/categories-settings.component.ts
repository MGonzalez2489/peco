import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {CATEGORY_APPLY_TYPE_LABEL} from '@core/constants';
import {Category} from '@core/models';
import {CatalogStore} from '@core/stores/catalog.store';
import {CategoryApplyType} from '@core/types';
import {toSoftCategoryColor} from '@core/utils';
import {AppIconComponent} from '@shared/components';
import {CategoryDeleteConfirmModalComponent} from '../category-delete-confirm-modal/category-delete-confirm-modal.component';
import {CategoryFormModalComponent} from '../category-form-modal/category-form-modal.component';

@Component({
  selector: 'app-categories-settings',
  imports: [AppIconComponent, CategoryFormModalComponent, CategoryDeleteConfirmModalComponent],
  templateUrl: './categories-settings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoriesSettingsComponent {
  readonly catalogStore = inject(CatalogStore);

  protected readonly toSoftCategoryColor = toSoftCategoryColor;
  protected readonly categories = computed(() =>
    [...this.catalogStore.categories()]
      .filter((category) => category.isSystem !== true)
      .sort((a, b) => {
        if (a.isRoot !== b.isRoot) return a.isRoot ? -1 : 1;
        return a.displayName.localeCompare(b.displayName);
      }),
  );

  protected readonly formOpen = signal(false);
  protected readonly categoryToEdit = signal<Category | null>(null);

  protected readonly deleteOpen = signal(false);
  protected readonly categoryToDelete = signal<Category | null>(null);

  protected readonly applyTypeLabel = (applyType: CategoryApplyType): string =>
    CATEGORY_APPLY_TYPE_LABEL[applyType];

  protected openCreate(): void {
    this.categoryToEdit.set(null);
    this.formOpen.set(true);
  }

  protected openEdit(category: Category): void {
    this.categoryToEdit.set(category);
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    this.formOpen.set(false);
    this.categoryToEdit.set(null);
  }

  protected saveCategory(draft: Omit<Category, 'id'>): void {
    const editing = this.categoryToEdit();

    if (editing) {
      this.catalogStore.updateCategory(editing.id, draft);
    } else {
      this.catalogStore.addCategory(draft);
    }

    this.closeForm();
  }

  protected openDelete(category: Category): void {
    this.categoryToDelete.set(category);
    this.deleteOpen.set(true);
  }

  protected closeDelete(): void {
    this.deleteOpen.set(false);
    this.categoryToDelete.set(null);
  }

  protected confirmDelete(): void {
    const target = this.categoryToDelete();
    if (target) {
      this.catalogStore.deleteCategory(target.id);
    }
    this.closeDelete();
  }
}
