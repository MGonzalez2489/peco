import {computed, inject} from '@angular/core';
import {
  withCallState,
  setError,
  setLoaded,
  setLoading,
  withDevtools,
} from '@angular-architects/ngrx-toolkit';
import {patchState, signalStore, withComputed, withMethods, withState} from '@ngrx/signals';
import {CreateMovementDTO} from '../dtos/create-movement.dto';
import {Movement} from '../models/movement.model';
import {MovementFilters} from '../models/movement-filters.model';
import {MovementTotals} from '../models/movement-totals.model';
import {MovementsStorageService} from '../services/movements-storage.service';
import {BalanceOperation} from '../types/balance-operation.type';
import {buildReversalMovement} from '../utils/build-reversal-movement.util';
import {formatCurrency} from '../utils/format-currency.util';
import {groupMovementsByDate} from '../utils/group-movements-by-date.util';
import {AccountsStore} from './accounts.store';
import {CatalogStore} from './catalog.store';

interface MovementsState {
  movements: Movement[];
  filters: MovementFilters;
}

const INITIAL_FILTERS: MovementFilters = {
  type: 'ALL',
  accountId: '',
  categoryId: '',
  hideReversals: false,
};

const initialState = (): MovementsState => ({
  movements: inject(MovementsStorageService).getMovements(),
  filters: INITIAL_FILTERS,
});

const byNewestFirst = (a: Movement, b: Movement): number => b.date.localeCompare(a.date);

export const MovementsStore = signalStore(
  {providedIn: 'root'},
  withState(initialState),
  withCallState(),
  withComputed(({movements, filters}) => {
    const filtered = () => {
      const {type, accountId, categoryId, hideReversals} = filters();

      return movements()
        .filter((movement) => {
          const matchesType = type === 'ALL' || movement.type === type;
          const matchesAccount =
            !accountId ||
            movement.accountId === accountId ||
            movement.targetAccountId === accountId;
          const matchesCategory = !categoryId || movement.categoryId === categoryId;
          const matchesReversal = !hideReversals || (!movement.isReversal && !movement.reversalId);

          return matchesType && matchesAccount && matchesCategory && matchesReversal;
        })
        .sort(byNewestFirst);
    };

    return {
      sortedMovements: computed(() => [...movements()].sort(byNewestFirst)),
      filteredMovements: computed(filtered),
      groupedMovementsByDate: computed(() => groupMovementsByDate(filtered())),
      filteredTotals: computed<MovementTotals>(() => {
        const {totalIncome, totalExpenses} = filtered().reduce(
          (accumulator, movement) => {
            if (movement.type === 'INCOME') accumulator.totalIncome += movement.amount;
            if (movement.type === 'EXPENSE') accumulator.totalExpenses += movement.amount;
            return accumulator;
          },
          {totalIncome: 0, totalExpenses: 0},
        );

        return {totalIncome, totalExpenses, netBalance: totalIncome - totalExpenses};
      }),
      activeFilterCount: computed(() => {
        const {type, accountId, categoryId, hideReversals} = filters();
        return (
          (type !== 'ALL' ? 1 : 0) +
          (accountId ? 1 : 0) +
          (categoryId ? 1 : 0) +
          (hideReversals ? 1 : 0)
        );
      }),
      hasActiveFilters: computed(() => {
        const {type, accountId, categoryId, hideReversals} = filters();
        return type !== 'ALL' || accountId !== '' || categoryId !== '' || hideReversals;
      }),
    };
  }),
  withMethods((store) => {
    const storage = inject(MovementsStorageService);
    const accountsStore = inject(AccountsStore);
    const catalogStore = inject(CatalogStore);

    const commit = (movements: Movement[]): void => {
      patchState(store, {movements});
      storage.saveMovements(movements);
    };

    const applyBalanceImpact = (movement: Movement): void => {
      const sourceOperation: BalanceOperation = movement.type === 'INCOME' ? 'ADD' : 'SUBTRACT';
      accountsStore.updateBalance(movement.accountId, movement.amount, sourceOperation);

      if (movement.type === 'TRANSFER' && movement.targetAccountId) {
        accountsStore.updateBalance(movement.targetAccountId, movement.amount, 'ADD');
      }
    };

    const registerMovement = (dto: CreateMovementDTO): Movement | null => {
      try {
        const movement: Movement = {
          id: crypto.randomUUID(),
          date: dto.date ?? new Date().toISOString(),
          accountId: dto.accountId,
          categoryId: dto.categoryId || catalogStore.defaultCategoryIdFor(dto.type),
          type: dto.type,
          amount: dto.amount,
          note: dto.note,
          targetAccountId: dto.targetAccountId,
        };

        commit([movement, ...store.movements()]);
        applyBalanceImpact(movement);
        patchState(store, setLoaded());

        return movement;
      } catch (error) {
        patchState(store, setError(error));
        return null;
      }
    };

    return {
      loadMovements(): void {
        patchState(store, setLoading());
        try {
          commit(storage.getMovements());
          patchState(store, setLoaded());
        } catch (error) {
          patchState(store, setError(error));
        }
      },
      registerMovement,
      revertMovement(id: string): boolean {
        const original = store.movements().find((movement) => movement.id === id);
        if (!original || original.isReversal) return false;

        try {
          const reversal = buildReversalMovement(original);
          const next = store
            .movements()
            .map((movement) =>
              movement.id === original.id ? {...movement, isReversal: true} : movement,
            );

          commit([reversal, ...next]);
          applyBalanceImpact(reversal);
          patchState(store, setLoaded());

          return true;
        } catch (error) {
          patchState(store, setError(error));
          return false;
        }
      },
      deleteAccount(id: string, targetAccountId?: string): void {
        const account = accountsStore.accounts().find((item) => item.id === id);
        if (!account) return;

        if (account.currentBalance !== 0 && targetAccountId && targetAccountId !== id) {
          registerMovement({
            accountId: id,
            categoryId: catalogStore.defaultCategoryIdFor('TRANSFER'),
            type: 'TRANSFER',
            amount: account.currentBalance,
            targetAccountId,
            note: `Eliminación de cuenta ${account.name} traspaso ${formatCurrency(account.currentBalance)}`,
          });
        }

        accountsStore.deleteAccount(id);
      },
      setFilters(filters: Partial<MovementFilters>): void {
        patchState(store, {filters: {...store.filters(), ...filters}});
      },
      clearFilters(): void {
        patchState(store, {filters: INITIAL_FILTERS});
      },
      recentMovements(limit = 5): Movement[] {
        return store.sortedMovements().slice(0, limit);
      },
      movementsForAccount(accountId: string): Movement[] {
        return store
          .sortedMovements()
          .filter(
            (movement) =>
              movement.accountId === accountId || movement.targetAccountId === accountId,
          );
      },
      resetError(): void {
        patchState(store, setLoaded());
      },
    };
  }),
  withDevtools('MovementsStore'),
);
