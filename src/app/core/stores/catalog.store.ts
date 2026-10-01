import {computed, inject} from '@angular/core';
import {
  setError,
  setLoaded,
  setLoading,
  withCallState,
  withDevtools,
} from '@angular-architects/ngrx-toolkit';
import {patchState, signalStore, withComputed, withMethods, withState} from '@ngrx/signals';
import {Category} from '../models/category.model';
import {CatalogStorageService} from '../services/catalog-storage.service';
import {MovementType} from '../types/movement-type.type';

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
    incomeCategories: computed(() =>
      categories().filter(
        (category) => category.applyType === 'INCOME' || category.applyType === 'BOTH',
      ),
    ),
    expenseCategories: computed(() =>
      categories().filter(
        (category) => category.applyType === 'EXPENSE' || category.applyType === 'BOTH',
      ),
    ),
    transferCategory: computed(() =>
      categories().find((category) => category.applyType === 'TRANSFER'),
    ),
  })),
  withMethods((store) => {
    const storage = inject(CatalogStorageService);

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

    return {
      loadCatalogs(): void {
        patchState(store, setLoading());
        try {
          patchState(store, {categories: storage.getCategories()});
          patchState(store, setLoaded());
        } catch (error) {
          patchState(store, setError(error));
        }
      },
      categoriesForType,
      defaultCategoryIdFor(type: MovementType): string {
        return categoriesForType(type)[0]?.id ?? '';
      },
      resetError(): void {
        patchState(store, setLoaded());
      },
    };
  }),
  withDevtools('CatalogStore'),
);
