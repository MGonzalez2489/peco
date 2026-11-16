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

  it('keeps the four canonical account types in the distribution', () => {
    const summaries = store.accountTypeSummaries();

    expect(summaries.map((summary) => summary.type)).toEqual([
      'CASH',
      'DEBIT',
      'CREDIT',
      'SAVINGS',
    ]);
    expect(summaries.find((summary) => summary.type === 'DEBIT')).toMatchObject({
      count: 0,
      total: 0,
      label: 'Débito',
    });
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

  it('clamps a negative initial balance for non-credit accounts', () => {
    const account = store.createAccount({
      name: 'Débito',
      initialBalance: -10000,
      type: 'DEBIT',
    });
    if (!account) throw new Error('account must be created');

    expect(account.currentBalance).toBe(0);
    expect(store.accounts().find((item) => item.id === account.id)?.currentBalance).toBe(0);
  });

  it('clamps a negative balance when updating a non-credit account', () => {
    const account = store.createAccount({
      name: 'Ahorro',
      initialBalance: 50000,
      type: 'SAVINGS',
    });
    if (!account) throw new Error('account must be created');

    store.updateAccount(account.id, {currentBalance: -10000});

    expect(store.accounts().find((item) => item.id === account.id)?.currentBalance).toBe(0);
  });

  it('clamps when an account is switched from credit to a non-credit type', () => {
    const account = store.createAccount({
      name: 'Tarjeta',
      initialBalance: -50000,
      type: 'CREDIT',
      creditLimit: 500000,
    });
    if (!account) throw new Error('account must be created');

    store.updateAccount(account.id, {type: 'DEBIT'});

    expect(store.accounts().find((item) => item.id === account.id)?.currentBalance).toBe(0);
  });

  it('keeps a negative balance for credit accounts', () => {
    const account = store.createAccount({
      name: 'Tarjeta',
      initialBalance: -150000,
      type: 'CREDIT',
      creditLimit: 500000,
    });
    if (!account) throw new Error('account must be created');

    expect(account.currentBalance).toBe(-150000);
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
