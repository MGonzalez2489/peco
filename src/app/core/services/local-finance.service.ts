import {Injectable, computed, effect, signal} from '@angular/core';
import {
  Category,
  CreateCategoryDTO,
  CreateMovementDTO,
  Movement,
  formatCurrency,
} from '../models/finance.model';
import {FinanceStorage} from './finance-storage.interface';

const STORAGE_KEY_CATEGORIES = 'peco.categories';
const STORAGE_KEY_MOVEMENTS = 'peco.movements';

@Injectable({providedIn: 'root'})
export class LocalFinanceService implements FinanceStorage {
  private readonly categoriesSignal = signal<Category[]>([]);
  private readonly movementsSignal = signal<Movement[]>([]);

  readonly categories = this.categoriesSignal.asReadonly();
  readonly movements = this.movementsSignal.asReadonly();

  readonly totalBalance = computed(() =>
    this.categories().reduce((total, category) => total + category.currentBalance, 0),
  );

  constructor() {
    const seed = createSeedData();
    this.categoriesSignal.set(this.readPersisted(STORAGE_KEY_CATEGORIES, seed.categories));
    this.movementsSignal.set(this.readPersisted(STORAGE_KEY_MOVEMENTS, seed.movements));

    effect(() => {
      localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(this.categories()));
      localStorage.setItem(STORAGE_KEY_MOVEMENTS, JSON.stringify(this.movements()));
    });
  }

  addCategory(dto: CreateCategoryDTO): void {
    const category: Category = {
      id: crypto.randomUUID(),
      name: dto.name.trim(),
      currentBalance: dto.initialBalance,
      targetGoal: dto.targetGoal,
      color: dto.color,
      icon: dto.icon,
    };
    this.categoriesSignal.update((current) => [...current, category]);
  }

  updateCategory(id: string, dto: CreateCategoryDTO): void {
    this.categoriesSignal.update((current) =>
      current.map((category) =>
        category.id === id
          ? {
              ...category,
              name: dto.name.trim(),
              targetGoal: dto.targetGoal,
              color: dto.color,
              icon: dto.icon ?? category.icon,
            }
          : category,
      ),
    );
  }

  deleteCategory(id: string, destinationCategoryId?: string): void {
    const category = this.categories().find((c) => c.id === id);
    if (!category) return;

    if (category.currentBalance !== 0 && destinationCategoryId && destinationCategoryId !== id) {
      const amount = category.currentBalance;
      this.registerMovement({
        categoryId: id,
        type: 'TRANSFER',
        amount,
        destinationCategoryId,
        note: `Eliminación de cuenta ${category.name} traspaso ${formatCurrency(amount)}`,
      });
    }

    this.categoriesSignal.update((current) => current.filter((c) => c.id !== id));
  }

  registerMovement(dto: CreateMovementDTO): void {
    const movement: Movement = {
      id: crypto.randomUUID(),
      date: dto.date ?? new Date().toISOString(),
      categoryId: dto.categoryId,
      type: dto.type,
      amount: dto.amount,
      note: dto.note,
      destinationCategoryId: dto.destinationCategoryId,
    };

    this.movementsSignal.update((current) => [movement, ...current]);
    this.applyMovement(movement, 1);
  }

  deleteMovement(id: string): void {
    const movement = this.movements().find((m) => m.id === id);
    if (!movement) return;

    this.movementsSignal.update((current) => current.filter((m) => m.id !== id));
    this.applyMovement(movement, -1);
  }

  private applyMovement(movement: Movement, direction: 1 | -1): void {
    this.categoriesSignal.update((current) =>
      current.map((category) => {
        let balance = category.currentBalance;

        if (category.id === movement.categoryId) {
          const sourceDelta = movement.type === 'INCOME' ? movement.amount : -movement.amount;
          balance += direction * sourceDelta;
        }

        if (
          movement.type === 'TRANSFER' &&
          movement.destinationCategoryId &&
          category.id === movement.destinationCategoryId
        ) {
          balance += direction * movement.amount;
        }

        return balance === category.currentBalance
          ? category
          : {...category, currentBalance: balance};
      }),
    );
  }

  private readPersisted<T>(key: string, fallback: T[]): T[] {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const data = JSON.parse(raw) as unknown;
      return Array.isArray(data) ? (data as T[]) : fallback;
    } catch {
      return fallback;
    }
  }
}

function createSeedData(): {categories: Category[]; movements: Movement[]} {
  const daysAgo = (days: number): string => new Date(Date.now() - days * 86_400_000).toISOString();

  const categories: Category[] = [
    {
      id: 'c-cash',
      name: 'Efectivo',
      currentBalance: 430,
      targetGoal: 1000,
      color: 'emerald',
      icon: 'wallet',
    },
    {
      id: 'c-savings',
      name: 'Ahorro',
      currentBalance: 1700,
      targetGoal: 5000,
      color: 'violet',
      icon: 'savings',
    },
    {
      id: 'c-investment',
      name: 'Inversión',
      currentBalance: 800,
      color: 'amber',
      icon: 'investment',
    },
  ];

  const movements: Movement[] = [
    {
      id: 'm-1',
      categoryId: 'c-cash',
      type: 'INCOME',
      amount: 2000,
      date: daysAgo(6),
      note: 'Nómina',
    },
    {
      id: 'm-2',
      categoryId: 'c-cash',
      type: 'EXPENSE',
      amount: 550,
      date: daysAgo(5),
      note: 'Mercado',
    },
    {
      id: 'm-3',
      categoryId: 'c-cash',
      type: 'EXPENSE',
      amount: 320,
      date: daysAgo(3),
      note: 'Restaurante',
    },
    {
      id: 'm-4',
      categoryId: 'c-savings',
      type: 'INCOME',
      amount: 1000,
      date: daysAgo(4),
      note: 'Bonificación',
    },
    {
      id: 'm-5',
      categoryId: 'c-cash',
      type: 'TRANSFER',
      amount: 700,
      date: daysAgo(2),
      destinationCategoryId: 'c-savings',
      note: 'Ahorro automático',
    },
    {
      id: 'm-6',
      categoryId: 'c-investment',
      type: 'INCOME',
      amount: 800,
      date: daysAgo(1),
      note: 'Dividendos',
    },
  ];

  return {categories, movements};
}
