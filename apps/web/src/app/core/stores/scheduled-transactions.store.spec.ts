import {TestBed} from '@angular/core/testing';
import {LOCAL_STORAGE_KEYS} from '../constants/local-storage-keys.constant';
import {SCHEDULED_TRANSACTION_TYPE_MAP} from '../constants/scheduled-transaction-type-map.constant';
import {CreateScheduledTransactionDto} from '../dtos/create-scheduled-transaction.dto';
import {ScheduledTransactionTypeKey} from '../types/scheduled-transaction-type-key.enum';
import {todayIsoDate} from '../utils/today-iso-date.util';
import {AccountsStore} from './accounts.store';
import {CatalogStore} from './catalog.store';
import {MovementsStore} from './movements.store';
import {ScheduledTransactionsStore} from './scheduled-transactions.store';

const typeOf = (key: ScheduledTransactionTypeKey) => SCHEDULED_TRANSACTION_TYPE_MAP[key];

describe('ScheduledTransactionsStore', () => {
  let store: InstanceType<typeof ScheduledTransactionsStore>;
  let accountsStore: InstanceType<typeof AccountsStore>;
  let movementsStore: InstanceType<typeof MovementsStore>;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [AccountsStore, CatalogStore, MovementsStore, ScheduledTransactionsStore],
    });

    store = TestBed.inject(ScheduledTransactionsStore);
    accountsStore = TestBed.inject(AccountsStore);
    movementsStore = TestBed.inject(MovementsStore);
  });

  afterEach(() => {
    localStorage.clear();
  });

  const create = (
    overrides: Partial<CreateScheduledTransactionDto> = {},
  ): CreateScheduledTransactionDto => {
    const account = accountsStore.accounts()[0];
    return {
      name: 'Alquiler',
      estimatedAmount: 500,
      type: typeOf(ScheduledTransactionTypeKey.EXPENSE),
      categoryId: 'services',
      sourceAccountId: account.id,
      frequency: 'MONTHLY',
      interval: 1,
      nextExecutionDate: '2030-01-01',
      autoApply: false,
      active: true,
      ...overrides,
    };
  };

  it('loads with no schedules by default', () => {
    expect(store.scheduledTransactions()).toEqual([]);
    expect(store.activeSchedules()).toEqual([]);
  });

  it('creates a schedule and persists it', () => {
    const created = store.createScheduledTransaction(create());

    expect(created).not.toBeNull();
    expect(store.scheduledTransactions().length).toBe(1);
    expect(store.activeSchedules().length).toBe(1);
    expect(created?.completedOccurrences).toBe(0);
  });

  it('executes a schedule, creates a movement and advances the date', () => {
    const created = store.createScheduledTransaction(create({nextExecutionDate: '2020-01-01'}));
    if (!created) throw new Error('schedule must be created');

    const before = accountsStore.accounts()[0].currentBalance;

    expect(store.executeScheduledTransaction(created.id, 450)).toBe(true);

    const updated = store.scheduleById(created.id);
    expect(updated?.completedOccurrences).toBe(1);
    expect(updated?.nextExecutionDate).toBe('2020-02-01');
    expect(movementsStore.movements()[0]?.amount).toBe(450);

    expect(accountsStore.accounts()[0].currentBalance).toBe(before - 450);
  });

  it('blocks execution of future schedules without touching balances', () => {
    const created = store.createScheduledTransaction(create({nextExecutionDate: '2030-01-01'}));
    if (!created) throw new Error('schedule must be created');

    const before = accountsStore.accounts()[0].currentBalance;

    expect(store.executeScheduledTransaction(created.id)).toBe(false);

    expect(movementsStore.movements()).toEqual([]);
    expect(accountsStore.accounts()[0].currentBalance).toBe(before);

    const untouched = store.scheduleById(created.id);
    expect(untouched?.completedOccurrences).toBe(0);
    expect(untouched?.nextExecutionDate).toBe('2030-01-01');
  });

  it('deactivates the schedule once the occurrence limit is reached', () => {
    const created = store.createScheduledTransaction(
      create({totalOccurrences: 1, nextExecutionDate: '2020-01-01'}),
    );
    if (!created) throw new Error('schedule must be created');

    store.executeScheduledTransaction(created.id);

    const updated = store.scheduleById(created.id);
    expect(updated?.completedOccurrences).toBe(1);
    expect(updated?.active).toBe(false);
    expect(store.activeSchedules().length).toBe(0);
    expect(store.pausedSchedules().length).toBe(1);
  });

  it('cancels an occurrence without touching account balances', () => {
    const created = store.createScheduledTransaction(create());
    if (!created) throw new Error('schedule must be created');

    const before = accountsStore.accounts()[0].currentBalance;

    expect(store.cancelScheduledOccurrence(created.id)).toBe(true);

    expect(accountsStore.accounts()[0].currentBalance).toBe(before);
    expect(movementsStore.movements()[0]?.isCanceled).toBe(true);
    expect(store.scheduleById(created.id)?.nextExecutionDate).toBe('2030-02-01');
  });

  it('projects the available balance using the monthly net impact', () => {
    store.createScheduledTransaction(
      create({
        type: typeOf(ScheduledTransactionTypeKey.INCOME),
        estimatedAmount: 1000,
        frequency: 'MONTHLY',
      }),
    );
    store.createScheduledTransaction(
      create({
        type: typeOf(ScheduledTransactionTypeKey.EXPENSE),
        estimatedAmount: 200,
        frequency: 'MONTHLY',
      }),
    );

    expect(store.monthlyCommitmentsSummary().totalIncome).toBe(1000);
    expect(store.monthlyCommitmentsSummary().totalExpenses).toBe(200);
    expect(store.monthlyCommitmentsSummary().netProjectedImpact).toBe(800);
    expect(store.projectedAvailableBalance()).toBe(accountsStore.availableBalance() + 800);
    expect(store.incomeCommitmentPercentage()).toBe(20);
  });

  it('splits the monthly equivalent when the interval is greater than one', () => {
    store.createScheduledTransaction(
      create({estimatedAmount: 200, frequency: 'MONTHLY', interval: 2}),
    );
    store.createScheduledTransaction(
      create({estimatedAmount: 2400, frequency: 'YEARLY', interval: 2}),
    );

    expect(store.monthlyCommitmentsSummary().totalExpenses).toBe(200);
  });

  it('advances the next execution date using the interval', () => {
    const created = store.createScheduledTransaction(
      create({frequency: 'MONTHLY', interval: 2, nextExecutionDate: '2026-01-15'}),
    );
    if (!created) throw new Error('schedule must be created');

    store.executeScheduledTransaction(created.id);

    expect(store.scheduleById(created.id)?.completedOccurrences).toBe(1);
    expect(store.scheduleById(created.id)?.nextExecutionDate).toBe('2026-03-15');
  });

  it('normalizes legacy schedules missing frequency and interval on load', () => {
    localStorage.setItem(
      LOCAL_STORAGE_KEYS.scheduledTransactions,
      JSON.stringify([
        {
          id: 'legacy-1',
          name: 'Legado',
          estimatedAmount: 200,
          type: 'EXPENSE',
          categoryId: 'services',
          sourceAccountId: accountsStore.accounts()[0].id,
          nextExecutionDate: '2030-01-01',
          autoApply: false,
          active: true,
          completedOccurrences: 0,
          createdAt: '2020-01-01T00:00:00.000Z',
          updatedAt: '2020-01-01T00:00:00.000Z',
        },
      ]),
    );

    store.loadScheduledTransactions();

    const loaded = store.scheduleById('legacy-1');
    expect(loaded?.frequency).toBe('MONTHLY');
    expect(loaded?.interval).toBe(1);
    expect(loaded?.type.key).toBe(ScheduledTransactionTypeKey.EXPENSE);
    expect(store.monthlyCommitmentsSummary().totalExpenses).toBe(200);
  });

  it('toggles and deletes schedules', () => {
    const created = store.createScheduledTransaction(create());
    if (!created) throw new Error('schedule must be created');

    store.toggleScheduleActiveStatus(created.id);
    expect(store.scheduleById(created.id)?.active).toBe(false);

    expect(store.deleteScheduledTransaction(created.id)).toBe(true);
    expect(store.scheduledTransactions().length).toBe(0);
    expect(store.deleteScheduledTransaction('missing')).toBe(false);
  });

  it('counts the list with search and category filters but ignores the type chip', () => {
    store.createScheduledTransaction(
      create({name: 'Alquiler', categoryId: 'services', estimatedAmount: 500}),
    );
    store.createScheduledTransaction(
      create({
        name: 'Nómina',
        type: typeOf(ScheduledTransactionTypeKey.INCOME),
        categoryId: 'payroll',
        estimatedAmount: 1000,
      }),
    );

    expect(store.totalFilteredCount()).toBe(2);
    expect(store.incomeFilteredCount()).toBe(1);
    expect(store.expenseFilteredCount()).toBe(1);

    store.setSearchQuery('Alquiler');
    expect(store.totalFilteredCount()).toBe(1);
    expect(store.incomeFilteredCount()).toBe(0);
    expect(store.expenseFilteredCount()).toBe(1);

    store.setSearchQuery('');
    store.setTypeFilter('INCOME');
    expect(store.totalFilteredCount()).toBe(1);
    expect(store.incomeFilteredCount()).toBe(1);
    expect(store.expenseFilteredCount()).toBe(1);

    store.setTypeFilter('ALL');
    store.setCategoryFilter('payroll');
    expect(store.totalFilteredCount()).toBe(1);
    expect(store.incomeFilteredCount()).toBe(1);
    expect(store.expenseFilteredCount()).toBe(0);
  });

  it('filters schedules by the transfer type', () => {
    const account = accountsStore.accounts()[0];
    const destination = accountsStore.accounts()[1] ?? account;

    store.createScheduledTransaction(create({name: 'Alquiler'}));
    store.createScheduledTransaction(
      create({
        name: 'Ahorro',
        type: typeOf(ScheduledTransactionTypeKey.TRANSFER),
        categoryId: 'transfer',
        destinationAccountId: destination.id,
      }),
    );

    store.setTypeFilter('TRANSFER');

    const filtered = store.filteredSchedules();
    expect(filtered.length).toBe(1);
    expect(filtered[0].type.key).toBe(ScheduledTransactionTypeKey.TRANSFER);

    store.setTypeFilter('ALL');
    expect(store.filteredSchedules().length).toBe(2);
  });

  it('builds the income and expense category distributions separately', () => {
    store.createScheduledTransaction(
      create({
        name: 'Nómina',
        type: typeOf(ScheduledTransactionTypeKey.INCOME),
        categoryId: 'payroll',
        estimatedAmount: 1000,
      }),
    );
    store.createScheduledTransaction(
      create({
        name: 'Freelance',
        type: typeOf(ScheduledTransactionTypeKey.INCOME),
        categoryId: 'payroll',
        estimatedAmount: 500,
      }),
    );
    store.createScheduledTransaction(
      create({name: 'Supermercado', categoryId: 'services', estimatedAmount: 500}),
    );

    const income = store.incomeCategoryDistributionSummary();
    expect(income.length).toBe(1);
    expect(income[0].categoryName).toBe('Nómina');
    expect(income[0].totalAmount).toBe(1500);
    expect(income[0].percentage).toBe(100);

    const expenses = store.categoryDistributionSummary();
    expect(expenses.length).toBe(1);
    expect(expenses[0].categoryName).toBe('Servicios');
    expect(expenses[0].totalAmount).toBe(500);
    expect(expenses[0].percentage).toBe(100);
  });

  it('auto-applies only active due schedules with autoApply enabled', () => {
    const dueAuto = store.createScheduledTransaction(
      create({name: 'Internet', nextExecutionDate: '2020-01-01', autoApply: true}),
    );
    store.createScheduledTransaction(
      create({name: 'Seguro', nextExecutionDate: '2030-01-01', autoApply: true}),
    );
    store.createScheduledTransaction(
      create({name: 'Alquiler manual', nextExecutionDate: '2020-01-01', autoApply: false}),
    );
    if (!dueAuto) throw new Error('schedule must be created');

    const before = accountsStore.accounts()[0].currentBalance;

    const executedIds = store.autoApplyDueSchedules();

    expect(executedIds).toEqual([dueAuto.id]);
    expect(movementsStore.movements().length).toBe(1);
    expect(movementsStore.movements()[0]?.note).toBe('Internet');
    expect(store.scheduleById(dueAuto.id)?.completedOccurrences).toBe(1);
    expect(store.scheduleById(dueAuto.id)?.nextExecutionDate).toBe('2020-02-01');
    expect(accountsStore.accounts()[0].currentBalance).toBe(before - 500);
  });

  it('skips paused schedules even when they are due with autoApply', () => {
    const paused = store.createScheduledTransaction(
      create({nextExecutionDate: '2020-01-01', autoApply: true}),
    );
    if (!paused) throw new Error('schedule must be created');

    store.toggleScheduleActiveStatus(paused.id);

    expect(store.autoApplyDueSchedules()).toEqual([]);
    expect(movementsStore.movements()).toEqual([]);
    expect(store.scheduleById(paused.id)?.completedOccurrences).toBe(0);
  });

  it('applies every due auto-apply schedule and deactivates those reaching the occurrence limit', () => {
    const singleUse = store.createScheduledTransaction(
      create({
        name: 'Cuota única',
        totalOccurrences: 1,
        nextExecutionDate: '2020-01-01',
        autoApply: true,
      }),
    );
    const recurring = store.createScheduledTransaction(
      create({name: 'Internet', nextExecutionDate: '2020-01-15', autoApply: true}),
    );
    if (!singleUse || !recurring) throw new Error('schedules must be created');

    const executedIds = store.autoApplyDueSchedules();

    expect(executedIds).toHaveLength(2);
    expect(executedIds).toContain(singleUse.id);
    expect(executedIds).toContain(recurring.id);
    expect(movementsStore.movements().length).toBe(2);
    expect(store.scheduleById(singleUse.id)?.active).toBe(false);
    expect(store.scheduleById(recurring.id)?.active).toBe(true);
    expect(store.activeSchedules().length).toBe(1);
  });

  it('does not re-apply an occurrence after the schedule has advanced in the same session', () => {
    const created = store.createScheduledTransaction(
      create({nextExecutionDate: todayIsoDate(), autoApply: true}),
    );
    if (!created) throw new Error('schedule must be created');

    expect(store.autoApplyDueSchedules()).toEqual([created.id]);
    expect(movementsStore.movements().length).toBe(1);
    expect(store.scheduleById(created.id)?.completedOccurrences).toBe(1);

    // The schedule advanced to the next period, so a second run in the same
    // session must not register the movement again.
    expect(store.autoApplyDueSchedules()).toEqual([]);
    expect(movementsStore.movements().length).toBe(1);
    expect(store.scheduleById(created.id)?.completedOccurrences).toBe(1);
  });

  it('auto-applies due schedules when the store initializes on app open', () => {
    const accountId = accountsStore.accounts()[0].id;
    const persistedSchedule = (
      id: string,
      name: string,
      autoApply: boolean,
    ): Record<string, unknown> => ({
      id,
      name,
      estimatedAmount: 500,
      type: typeOf(ScheduledTransactionTypeKey.EXPENSE),
      categoryId: 'services',
      sourceAccountId: accountId,
      frequency: 'MONTHLY',
      interval: 1,
      nextExecutionDate: '2020-01-01',
      autoApply,
      active: true,
      completedOccurrences: 0,
      createdAt: '2020-01-01T00:00:00.000Z',
      updatedAt: '2020-01-01T00:00:00.000Z',
    });

    localStorage.setItem(
      LOCAL_STORAGE_KEYS.scheduledTransactions,
      JSON.stringify([
        persistedSchedule('seed-auto', 'Alquiler', true),
        persistedSchedule('seed-manual', 'Alquiler manual', false),
      ]),
    );

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [AccountsStore, CatalogStore, MovementsStore, ScheduledTransactionsStore],
    });

    const freshStore = TestBed.inject(ScheduledTransactionsStore);
    const freshMovementsStore = TestBed.inject(MovementsStore);

    expect(freshMovementsStore.movements().length).toBe(1);
    expect(freshMovementsStore.movements()[0]?.note).toBe('Alquiler');
    expect(freshStore.scheduleById('seed-auto')?.completedOccurrences).toBe(1);
    expect(freshStore.scheduleById('seed-auto')?.nextExecutionDate).toBe('2020-02-01');
    expect(freshStore.scheduleById('seed-manual')?.completedOccurrences).toBe(0);
  });
});
