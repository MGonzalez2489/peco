import {computed, inject} from '@angular/core';
import {
  setError,
  setLoaded,
  setLoading,
  withCallState,
  withDevtools,
} from '@angular-architects/ngrx-toolkit';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import {CreateScheduledTransactionDto} from '../dtos/create-scheduled-transaction.dto';
import {IconName} from '@shared/components/app-icon/app-icon.component';
import {MonthlyCommitmentsSummary} from '../models/monthly-commitments.model';
import {ScheduledTransaction} from '../models/scheduled-transaction.model';
import {ScheduledTransactionsStorageService} from '../services/scheduled-transactions-storage.service';
import {isIncomeSchedule} from '../utils/is-income-schedule.util';
import {isScheduleDue} from '../utils/is-schedule-due.util';
import {monthlyEquivalent} from '../utils/monthly-equivalent.util';
import {nextExecutionDate} from '../utils/next-execution-date.util';
import {todayIsoDate} from '../utils/today-iso-date.util';
import {toIsoDate} from '../utils/to-iso-date.util';
import {AccountsStore} from './accounts.store';
import {CatalogStore} from './catalog.store';
import {MovementsStore} from './movements.store';

export interface CategoryDistributionItem {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: IconName;
  totalAmount: number;
  percentage: number;
}

interface ScheduledTransactionsState {
  scheduledTransactions: ScheduledTransaction[];
  isLoading: boolean;
  timeframeFilterDays: number;
  searchQuery: string;
  typeFilter: 'ALL' | 'INCOME' | 'EXPENSE';
  selectedCategoryId: string | null;
}

const DEFAULT_TIMEFRAME_DAYS = 30;
const FALLBACK_CATEGORY_COLOR = '#94a3b8';

const initialState = (): ScheduledTransactionsState => ({
  scheduledTransactions: inject(ScheduledTransactionsStorageService).getAll(),
  isLoading: false,
  timeframeFilterDays: DEFAULT_TIMEFRAME_DAYS,
  searchQuery: '',
  typeFilter: 'ALL',
  selectedCategoryId: null,
});

const byNextExecutionAscending = (a: ScheduledTransaction, b: ScheduledTransaction): number =>
  a.nextExecutionDate.localeCompare(b.nextExecutionDate);

export const ScheduledTransactionsStore = signalStore(
  {providedIn: 'root'},
  withState(initialState),
  withCallState(),
  withComputed(
    ({scheduledTransactions, timeframeFilterDays, searchQuery, typeFilter, selectedCategoryId}) => {
      const accountsStore = inject(AccountsStore);
      const catalogStore = inject(CatalogStore);

      const activeSchedules = computed(() => scheduledTransactions().filter((item) => item.active));

      const today = computed(() => todayIsoDate());

      const timeframeLimitDate = computed(() =>
        toIsoDate(new Date(Date.now() + timeframeFilterDays() * 86_400_000)),
      );

      const monthlyCommitmentsSummary = computed<MonthlyCommitmentsSummary>(() =>
        activeSchedules().reduce<MonthlyCommitmentsSummary>(
          (accumulator, item) => {
            if (item.type === 'TRANSFER') {
              return accumulator;
            }

            const amount = monthlyEquivalent(item.estimatedAmount, item.frequency);

            if (isIncomeSchedule(item.type)) {
              accumulator.totalIncome += amount;
            } else {
              accumulator.totalExpenses += amount;
            }

            accumulator.netProjectedImpact = accumulator.totalIncome - accumulator.totalExpenses;

            return accumulator;
          },
          {totalIncome: 0, totalExpenses: 0, netProjectedImpact: 0},
        ),
      );

      const matchesSearchAndCategory = (item: ScheduledTransaction): boolean => {
        const query = searchQuery().trim().toLowerCase();
        if (query && !item.name.toLowerCase().includes(query)) return false;

        const category = selectedCategoryId();
        return category === null || item.categoryId === category;
      };

      const baseFilteredSchedules = computed(() =>
        [...activeSchedules()].filter(matchesSearchAndCategory).sort(byNextExecutionAscending),
      );

      const filteredSchedules = computed(() => {
        const type = typeFilter();
        if (type === 'ALL') return baseFilteredSchedules();

        return baseFilteredSchedules().filter((item) => item.type === type);
      });

      const buildCategoryDistribution = (
        total: number,
        matchesType: (item: ScheduledTransaction) => boolean,
      ): CategoryDistributionItem[] => {
        if (total <= 0) return [];

        const categoriesById = new Map(
          catalogStore.categories().map((category) => [category.id, category]),
        );
        const grouped = new Map<string, CategoryDistributionItem>();

        for (const item of activeSchedules()) {
          if (!matchesType(item)) continue;

          const amount = monthlyEquivalent(item.estimatedAmount, item.frequency);
          if (amount <= 0) continue;

          const existing = grouped.get(item.categoryId);
          if (existing) {
            existing.totalAmount += amount;
            continue;
          }

          const category = categoriesById.get(item.categoryId);
          grouped.set(item.categoryId, {
            categoryId: item.categoryId,
            categoryName: category?.displayName ?? 'Sin categoría',
            categoryColor: category?.color ?? FALLBACK_CATEGORY_COLOR,
            categoryIcon: category?.icon ?? 'folder-open',
            totalAmount: amount,
            percentage: 0,
          });
        }

        return [...grouped.values()]
          .map((entry) => ({
            ...entry,
            percentage: Math.round((entry.totalAmount / total) * 100),
          }))
          .sort((a, b) => b.totalAmount - a.totalAmount);
      };

      return {
        activeSchedules: computed(() => [...activeSchedules()].sort(byNextExecutionAscending)),
        pausedSchedules: computed(() =>
          scheduledTransactions()
            .filter((item) => !item.active)
            .sort(byNextExecutionAscending),
        ),
        today,
        timeframeLimitDate,
        dueTodayOrOverdue: computed(() =>
          [...activeSchedules()]
            .filter((item) => item.nextExecutionDate <= today())
            .sort(byNextExecutionAscending),
        ),
        upcomingInTimeframe: computed(() =>
          [...activeSchedules()]
            .filter(
              (item) =>
                item.nextExecutionDate >= today() && item.nextExecutionDate <= timeframeLimitDate(),
            )
            .sort(byNextExecutionAscending),
        ),
        monthlyCommitmentsSummary,
        projectedMonthlyNet: computed(() => monthlyCommitmentsSummary().netProjectedImpact),
        netImpact: computed(() => monthlyCommitmentsSummary().netProjectedImpact),
        projectedAvailableBalance: computed(
          () => accountsStore.totalBalance() + monthlyCommitmentsSummary().netProjectedImpact,
        ),
        incomeCommitmentPercentage: computed(() => {
          const {totalIncome, totalExpenses} = monthlyCommitmentsSummary();
          if (totalIncome <= 0) return 0;
          return Math.min(100, Math.max(0, Math.round((totalExpenses / totalIncome) * 100)));
        }),
        hasOverdueSchedules: computed(() =>
          activeSchedules().some((item) => item.nextExecutionDate < today()),
        ),
        filteredSchedules,
        totalFilteredCount: computed(() => filteredSchedules().length),
        incomeFilteredCount: computed(
          () => baseFilteredSchedules().filter((item) => isIncomeSchedule(item.type)).length,
        ),
        expenseFilteredCount: computed(
          () => baseFilteredSchedules().filter((item) => item.type === 'EXPENSE').length,
        ),
        categoryDistributionSummary: computed(() =>
          buildCategoryDistribution(
            monthlyCommitmentsSummary().totalExpenses,
            (item) => item.type === 'EXPENSE',
          ),
        ),
        incomeCategoryDistributionSummary: computed(() =>
          buildCategoryDistribution(monthlyCommitmentsSummary().totalIncome, (item) =>
            isIncomeSchedule(item.type),
          ),
        ),
      };
    },
  ),
  withMethods((store) => {
    const storage = inject(ScheduledTransactionsStorageService);
    const movementsStore = inject(MovementsStore);

    const commit = (items: ScheduledTransaction[]): void => {
      patchState(store, {scheduledTransactions: items});
      storage.saveAll(items);
    };

    const isStopConditionMet = (item: ScheduledTransaction): boolean => {
      const reachedOccurrences =
        item.totalOccurrences !== undefined && item.completedOccurrences >= item.totalOccurrences;
      const exceededEndDate = item.endDate !== undefined && item.nextExecutionDate > item.endDate;

      return reachedOccurrences || exceededEndDate;
    };

    const advanceSchedule = (item: ScheduledTransaction): ScheduledTransaction => {
      const completedOccurrences = item.completedOccurrences + 1;
      const advanced: ScheduledTransaction = {
        ...item,
        completedOccurrences,
        nextExecutionDate: nextExecutionDate(item.nextExecutionDate, item.frequency),
        updatedAt: new Date().toISOString(),
      };

      return isStopConditionMet(advanced) ? {...advanced, active: false} : advanced;
    };

    const advanceOccurrence = (id: string): void => {
      commit(
        store
          .scheduledTransactions()
          .map((item) => (item.id === id ? advanceSchedule(item) : item)),
      );
    };

    return {
      loadScheduledTransactions(): void {
        patchState(store, setLoading());
        patchState(store, {isLoading: true});
        try {
          commit(storage.getAll());
          patchState(store, setLoaded());
        } catch (error) {
          patchState(store, setError(error));
        } finally {
          patchState(store, {isLoading: false});
        }
      },
      createScheduledTransaction(dto: CreateScheduledTransactionDto): ScheduledTransaction | null {
        try {
          const now = new Date().toISOString();
          const item: ScheduledTransaction = {
            ...dto,
            id: crypto.randomUUID(),
            completedOccurrences: 0,
            createdAt: now,
            updatedAt: now,
          };

          commit([...store.scheduledTransactions(), item]);
          patchState(store, setLoaded());

          return item;
        } catch (error) {
          patchState(store, setError(error));
          return null;
        }
      },
      updateScheduledTransaction(item: ScheduledTransaction): void {
        commit(
          store
            .scheduledTransactions()
            .map((entry) =>
              entry.id === item.id
                ? {...item, id: entry.id, updatedAt: new Date().toISOString()}
                : entry,
            ),
        );
      },
      toggleScheduleActiveStatus(id: string): void {
        commit(
          store
            .scheduledTransactions()
            .map((item) =>
              item.id === id
                ? {...item, active: !item.active, updatedAt: new Date().toISOString()}
                : item,
            ),
        );
      },
      deleteScheduledTransaction(id: string): boolean {
        if (!store.scheduledTransactions().some((item) => item.id === id)) return false;

        commit(store.scheduledTransactions().filter((item) => item.id !== id));
        return true;
      },
      reassignCategoryId(sourceCategoryId: string, targetCategoryId: string): void {
        if (sourceCategoryId === targetCategoryId) return;
        if (!store.scheduledTransactions().some((item) => item.categoryId === sourceCategoryId)) {
          return;
        }

        commit(
          store
            .scheduledTransactions()
            .map((item) =>
              item.categoryId === sourceCategoryId
                ? {...item, categoryId: targetCategoryId, updatedAt: new Date().toISOString()}
                : item,
            ),
        );

        if (store.selectedCategoryId() === sourceCategoryId) {
          patchState(store, {selectedCategoryId: null});
        }
      },
      scheduleById(id: string): ScheduledTransaction | undefined {
        return store.scheduledTransactions().find((item) => item.id === id);
      },
      setTimeframeFilterDays(days: number): void {
        patchState(store, {timeframeFilterDays: Math.max(1, Math.round(days))});
      },
      executeScheduledTransaction(id: string, actualAmount?: number): boolean {
        const item = store.scheduledTransactions().find((entry) => entry.id === id);
        if (!item) return false;
        if (!isScheduleDue(item.nextExecutionDate, todayIsoDate())) return false;

        const movement = movementsStore.registerMovement({
          accountId: item.sourceAccountId,
          categoryId: item.categoryId,
          type: item.type,
          amount: actualAmount ?? item.estimatedAmount,
          targetAccountId: item.destinationAccountId,
          note: item.name,
        });

        if (!movement) return false;

        advanceOccurrence(id);
        return true;
      },
      cancelScheduledOccurrence(id: string): boolean {
        const item = store.scheduledTransactions().find((entry) => entry.id === id);
        if (!item) return false;

        const movement = movementsStore.registerCanceledMovement({
          accountId: item.sourceAccountId,
          categoryId: item.categoryId,
          type: item.type,
          amount: item.estimatedAmount,
          targetAccountId: item.destinationAccountId,
          note: `${item.name} — omitido`,
          scheduledTransactionId: item.id,
        });

        if (!movement) return false;

        advanceOccurrence(id);
        return true;
      },
      resetError(): void {
        patchState(store, setLoaded());
      },
      setSearchQuery(query: string): void {
        patchState(store, {searchQuery: query});
      },
      setTypeFilter(type: 'ALL' | 'INCOME' | 'EXPENSE'): void {
        patchState(store, {typeFilter: type});
      },
      setCategoryFilter(categoryId: string | null): void {
        patchState(store, {selectedCategoryId: categoryId});
      },
      resetFilters(): void {
        patchState(store, {
          searchQuery: '',
          typeFilter: 'ALL',
          selectedCategoryId: null,
        });
      },
    };
  }),
  withHooks({
    onInit(store) {
      store.loadScheduledTransactions();
    },
  }),
  withDevtools('ScheduledTransactionsStore'),
);
