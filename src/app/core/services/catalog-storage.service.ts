import {Injectable} from '@angular/core';
import {SEED_CATEGORIES} from '../constants/seed-categories.constant';
import {Category} from '../models/category.model';

@Injectable({providedIn: 'root'})
export class CatalogStorageService {
  getCategories(): Category[] {
    return SEED_CATEGORIES.map((category) => ({...category}));
  }
}
