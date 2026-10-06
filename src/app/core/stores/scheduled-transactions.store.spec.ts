import {TestBed} from '@angular/core/testing';
import {CreateScheduledTransactionDto} from '../dtos/create-scheduled-transaction.dto';
import {AccountsStore} from './accounts.store';
import {CatalogStore} from './catalog.store';
import {MovementsStore} from './movements.store';
import {ScheduledTransactionsStore} from './scheduled-transactions.store';

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

  const create = (
    overrides: Partial<CreateScheduledTransactionDto> = {},
  ): CreateScheduledTransactionDto => {
    const account = accountsStore.accounts()[0];
    return {
      name: 'Alquiler',
      estimatedAmount: 500,
      type: 'EXPENSE',
      categoryId: 'services',
      sourceAccountId: account.id,
      frequency: 'MONTHLY',
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
      create({type: 'INCOME', estimatedAmount: 1000, frequency: 'MONTHLY'}),
    );
    store.createScheduledTransaction(
      create({type: 'EXPENSE', estimatedAmount: 200, frequency: 'MONTHLY'}),
    );

    expect(store.monthlyCommitmentsSummary().totalIncome).toBe(1000);
    expect(store.monthlyCommitmentsSummary().totalExpenses).toBe(200);
    expect(store.monthlyCommitmentsSummary().netProjectedImpact).toBe(800);
    expect(store.projectedAvailableBalance()).toBe(accountsStore.totalBalance() + 800);
    expect(store.incomeCommitmentPercentage()).toBe(20);
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
      create({name: 'Nómina', type: 'INCOME', categoryId: 'payroll', estimatedAmount: 1000}),
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

  it('builds the income and expense category distributions separately', () => {
    store.createScheduledTransaction(
      create({name: 'Nómina', type: 'INCOME', categoryId: 'payroll', estimatedAmount: 1000}),
    );
    store.createScheduledTransaction(
      create({name: 'Freelance', type: 'INCOME', categoryId: 'payroll', estimatedAmount: 500}),
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
});
