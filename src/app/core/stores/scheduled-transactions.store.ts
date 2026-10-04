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
import {MovementsStore} from './movements.store';

interface ScheduledTransactionsState {
  scheduledTransactions: ScheduledTransaction[];
  isLoading: boolean;
  timeframeFilterDays: number;
}

const DEFAULT_TIMEFRAME_DAYS = 30;

const initialState = (): ScheduledTransactionsState => ({
  scheduledTransactions: inject(ScheduledTransactionsStorageService).getAll(),
  isLoading: false,
  timeframeFilterDays: DEFAULT_TIMEFRAME_DAYS,
});

const byNextExecutionAscending = (a: ScheduledTransaction, b: ScheduledTransaction): number =>
  a.nextExecutionDate.localeCompare(b.nextExecutionDate);

export const ScheduledTransactionsStore = signalStore(
  {providedIn: 'root'},
  withState(initialState),
  withCallState(),
  withComputed(({scheduledTransactions, timeframeFilterDays}) => {
    const accountsStore = inject(AccountsStore);

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
    };
  }),
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
    };
  }),
  withHooks({
    onInit(store) {
      store.loadScheduledTransactions();
    },
  }),
  withDevtools('ScheduledTransactionsStore'),
);
