import {InjectionToken, Signal, inject} from '@angular/core';
import {Category, CreateCategoryDTO, CreateMovementDTO, Movement} from '../models/finance.model';
import {LocalFinanceService} from './local-finance.service';

export interface FinanceStorage {
  readonly categories: Signal<readonly Category[]>;
  readonly movements: Signal<readonly Movement[]>;
  readonly totalBalance: Signal<number>;

  addCategory(dto: CreateCategoryDTO): void;
  updateCategory(id: string, dto: CreateCategoryDTO): void;
  deleteCategory(id: string, destinationCategoryId?: string): void;
  registerMovement(dto: CreateMovementDTO): void;
  deleteMovement(id: string): void;
}

export const FINANCE_STORAGE = new InjectionToken<FinanceStorage>('FINANCE_STORAGE', {
  providedIn: 'root',
  factory: () => inject(LocalFinanceService),
});
