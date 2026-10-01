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
    const created = store.createScheduledTransaction(create());
    if (!created) throw new Error('schedule must be created');

    const before = accountsStore.accounts()[0].currentBalance;

    expect(store.executeScheduledTransaction(created.id, 450)).toBe(true);

    const updated = store.scheduleById(created.id);
    expect(updated?.completedOccurrences).toBe(1);
    expect(updated?.nextExecutionDate).toBe('2030-02-01');
    expect(movementsStore.movements()[0]?.amount).toBe(450);

    expect(accountsStore.accounts()[0].currentBalance).toBe(before - 450);
  });

  it('deactivates the schedule once the occurrence limit is reached', () => {
    const created = store.createScheduledTransaction(create({totalOccurrences: 1}));
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
});
