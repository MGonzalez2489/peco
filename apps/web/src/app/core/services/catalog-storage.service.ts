import {Injectable} from '@angular/core';
import {LOCAL_STORAGE_KEYS} from '../constants/local-storage-keys.constant';
import {SEED_CATEGORIES} from '../constants/seed-categories.constant';
import {Category} from '../models/category.model';
import {ensureRootCategory} from '../utils/ensure-root-category.util';
import {readStorageArray} from '../utils/read-storage-array.util';
import {writeStorageArray} from '../utils/write-storage-array.util';

@Injectable({providedIn: 'root'})
export class CatalogStorageService {
  getCategories(): Category[] {
    const persisted = readStorageArray<Category>(LOCAL_STORAGE_KEYS.categories);
    if (persisted && persisted.length > 0) return ensureRootCategory(persisted);

    return ensureRootCategory(SEED_CATEGORIES.map((category) => ({...category})));
  }

  saveCategories(categories: Category[]): void {
    writeStorageArray(LOCAL_STORAGE_KEYS.categories, categories);
  }
}
