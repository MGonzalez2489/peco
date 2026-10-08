import {computed, inject, Injector} from '@angular/core';
import {
  setError,
  setLoaded,
  setLoading,
  withCallState,
  withDevtools,
} from '@angular-architects/ngrx-toolkit';
import {patchState, signalStore, withComputed, withMethods, withState} from '@ngrx/signals';
import {ROOT_CATEGORY_ID} from '../constants/root-category-id.constant';
import {Category} from '../models/category.model';
import {CatalogStorageService} from '../services/catalog-storage.service';
import {MovementType} from '../types/movement-type.type';
import {toCategorySlug} from '../utils/to-category-slug.util';
import {MovementsStore} from './movements.store';
import {ScheduledTransactionsStore} from './scheduled-transactions.store';

interface CatalogState {
  categories: Category[];
}

const initialState = (): CatalogState => ({
  categories: inject(CatalogStorageService).getCategories(),
});

export const CatalogStore = signalStore(
  {providedIn: 'root'},
  withState(initialState),
  withCallState(),
  withComputed(({categories}) => ({
    rootCategory: computed(
      () => categories().find((category) => category.id === ROOT_CATEGORY_ID) ?? null,
    ),
    incomeCategories: computed(() =>
      categories().filter(
        (category) =>
          category.isSystem !== true &&
          (category.applyType === 'INCOME' || category.applyType === 'BOTH'),
      ),
    ),
    expenseCategories: computed(() =>
      categories().filter(
        (category) =>
          category.isSystem !== true &&
          (category.applyType === 'EXPENSE' || category.applyType === 'BOTH'),
      ),
    ),
    transferCategory: computed(() =>
      categories().find((category) => category.applyType === 'TRANSFER'),
    ),
  })),
  withMethods((store) => {
    const storage = inject(CatalogStorageService);
    const injector = inject(Injector);

    const commit = (categories: Category[]): void => {
      patchState(store, {categories});
      storage.saveCategories(categories);
    };

    const categoriesForType = (type: MovementType): Category[] => {
      switch (type) {
        case 'INCOME':
          return store.incomeCategories();
        case 'EXPENSE':
          return store.expenseCategories();
        case 'TRANSFER': {
          const transfer = store.transferCategory();
          return transfer ? [transfer] : [];
        }
      }
    };

    const isRootCategory = (category: Category): boolean =>
      category.id === ROOT_CATEGORY_ID || category.isRoot === true;

    return {
      loadCatalogs(): void {
        patchState(store, setLoading());
        try {
          commit(storage.getCategories());
          patchState(store, setLoaded());
        } catch (error) {
          patchState(store, setError(error));
        }
      },
      categoriesForType,
      defaultCategoryIdFor(type: MovementType): string {
        const candidates = categoriesForType(type);
        return (
          candidates.find((category) => !isRootCategory(category))?.id ?? candidates[0]?.id ?? ''
        );
      },
      categoryById(id: string): Category | null {
        return store.categories().find((category) => category.id === id) ?? null;
      },
      addCategory(category: Omit<Category, 'id'>): Category | null {
        try {
          const displayName = category.displayName.trim();
          const created: Category = {
            ...category,
            id: crypto.randomUUID(),
            name: toCategorySlug(category.name || displayName),
            displayName,
          };

          commit([...store.categories(), created]);
          patchState(store, setLoaded());

          return created;
        } catch (error) {
          patchState(store, setError(error));
          return null;
        }
      },
      updateCategory(
        id: string,
        updates: Partial<Pick<Category, 'applyType' | 'color' | 'displayName' | 'icon'>>,
      ): void {
        const target = store.categories().find((category) => category.id === id);
        if (!target || isRootCategory(target) || target.isSystem === true) return;

        commit(
          store.categories().map((category) =>
            category.id === id
              ? {
                  ...category,
                  ...updates,
                  id: category.id,
                  name: category.name,
                  isRoot: category.isRoot,
                }
              : category,
          ),
        );
      },
      deleteCategory(id: string): boolean {
        const target = store.categories().find((category) => category.id === id);
        if (!target || isRootCategory(target) || target.isSystem === true) return false;

        injector.get(ScheduledTransactionsStore).reassignCategoryId(id, ROOT_CATEGORY_ID);
        injector.get(MovementsStore).reassignCategoryId(id, ROOT_CATEGORY_ID);

        commit(store.categories().filter((category) => category.id !== id));
        patchState(store, setLoaded());

        return true;
      },
      resetError(): void {
        patchState(store, setLoaded());
      },
    };
  }),
  withDevtools('CatalogStore'),
);
