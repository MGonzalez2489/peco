import {TestBed} from '@angular/core/testing';
import {AccountsStore} from './accounts.store';

describe('AccountsStore', () => {
  let store: InstanceType<typeof AccountsStore>;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({providers: [AccountsStore]});
    store = TestBed.inject(AccountsStore);
  });

  it('initializes with a single root cash account', () => {
    const accounts = store.accounts();

    expect(accounts.length).toBe(1);
    expect(accounts[0].type).toBe('CASH');
    expect(accounts[0].isRoot).toBe(true);
  });

  it('stores the semantic account type on creation', () => {
    const account = store.createAccount({
      name: 'Tarjeta',
      initialBalance: 0,
      type: 'CREDIT',
      creditLimit: 10000,
    });
    if (!account) throw new Error('account must be created');

    expect(account.type).toBe('CREDIT');
    expect(store.accounts().find((item) => item.id === account.id)?.type).toBe('CREDIT');
  });

  it('groups balances and counts by account type', () => {
    store.createAccount({
      name: 'Tarjeta',
      initialBalance: -1500,
      type: 'CREDIT',
      creditLimit: 5000,
    });
    store.createAccount({name: 'Ahorro viaje', initialBalance: 800, type: 'SAVINGS'});
    store.createAccount({name: 'Ahorro emergencia', initialBalance: 200, type: 'SAVINGS'});

    const summaries = store.accountTypeSummaries();
    const savings = summaries.find((summary) => summary.type === 'SAVINGS');
    const credit = summaries.find((summary) => summary.type === 'CREDIT');
    const cash = summaries.find((summary) => summary.type === 'CASH');

    expect(savings).toMatchObject({count: 2, total: 1000});
    expect(credit).toMatchObject({count: 1, total: -1500});
    expect(cash).toMatchObject({count: 1, total: 0});
  });

  it('keeps credit debt out of the liquid balance but inside the net worth', () => {
    store.createAccount({name: 'Tarjeta', initialBalance: -500, type: 'CREDIT', creditLimit: 5000});
    store.createAccount({name: 'Ahorro', initialBalance: 1200, type: 'SAVINGS'});

    expect(store.availableBalance()).toBe(1200);
    expect(store.totalBalance()).toBe(700);
    expect(store.liabilitiesBalance()).toBe(500);
  });

  it('treats an overpaid credit card as a liability with no outstanding debt', () => {
    store.createAccount({name: 'Tarjeta', initialBalance: 200, type: 'CREDIT', creditLimit: 5000});

    expect(store.liabilitiesBalance()).toBe(0);
    expect(store.availableBalance()).toBe(0);
    expect(store.totalBalance()).toBe(200);
  });

  it('ignores excluded liability accounts in the liquidation summary', () => {
    store.createAccount({
      name: 'Tarjeta',
      initialBalance: -900,
      type: 'CREDIT',
      creditLimit: 5000,
      includeInTotal: false,
    });

    expect(store.liabilitiesBalance()).toBe(0);
    expect(store.availableBalance()).toBe(0);
    expect(store.totalBalance()).toBe(-900);
  });

  it('updates the distribution when a credit payment is registered through a balance update', () => {
    const account = store.createAccount({
      name: 'Tarjeta',
      initialBalance: -1000,
      type: 'CREDIT',
      creditLimit: 5000,
    });
    if (!account) throw new Error('account must be created');

    store.updateBalance(account.id, 400, 'ADD');

    const credit = store.accountTypeSummaries().find((summary) => summary.type === 'CREDIT');
    expect(credit?.total).toBe(-600);
    expect(store.liabilitiesBalance()).toBe(600);
  });
});
