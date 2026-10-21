import {Account} from '../models/account.model';
import {buildAccountTypeDistribution} from './build-account-type-distribution.util';

const buildAccount = (overrides: Partial<Account>): Account => ({
  id: crypto.randomUUID(),
  name: 'Cuenta',
  currentBalance: 0,
  type: 'CASH',
  includeInTotal: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('buildAccountTypeDistribution', () => {
  it('always returns the four canonical account types', () => {
    const summaries = buildAccountTypeDistribution([]);

    expect(summaries.map((summary) => summary.type)).toEqual([
      'CASH',
      'DEBIT',
      'CREDIT',
      'SAVINGS',
    ]);
  });

  it('keeps empty account types with a zero count and a zero total', () => {
    const summaries = buildAccountTypeDistribution([buildAccount({type: 'CASH'})]);
    const debit = summaries.find((summary) => summary.type === 'DEBIT');

    expect(debit).toMatchObject({count: 0, total: 0, label: 'Débito'});
  });

  it('aggregates counts and signed totals per account type', () => {
    const summaries = buildAccountTypeDistribution([
      buildAccount({type: 'CASH', currentBalance: 100}),
      buildAccount({type: 'CASH', currentBalance: 50}),
      buildAccount({type: 'CREDIT', currentBalance: -1200}),
      buildAccount({type: 'SAVINGS', currentBalance: 800}),
      buildAccount({type: 'SAVINGS', currentBalance: -200}),
    ]);

    const cash = summaries.find((summary) => summary.type === 'CASH');
    const credit = summaries.find((summary) => summary.type === 'CREDIT');
    const savings = summaries.find((summary) => summary.type === 'SAVINGS');

    expect(cash).toMatchObject({count: 2, total: 150, label: 'Efectivo'});
    expect(credit).toMatchObject({count: 1, total: -1200, label: 'Crédito'});
    expect(savings).toMatchObject({count: 2, total: 600, label: 'Ahorro'});
  });

  it('orders summaries by the canonical account type list', () => {
    const summaries = buildAccountTypeDistribution([
      buildAccount({type: 'SAVINGS'}),
      buildAccount({type: 'CREDIT'}),
      buildAccount({type: 'DEBIT'}),
      buildAccount({type: 'CASH'}),
    ]);

    expect(summaries.map((summary) => summary.type)).toEqual([
      'CASH',
      'DEBIT',
      'CREDIT',
      'SAVINGS',
    ]);
  });

  it('exposes the type color and icon for the summary card', () => {
    const summaries = buildAccountTypeDistribution([buildAccount({type: 'CREDIT'})]);
    const credit = summaries.find((summary) => summary.type === 'CREDIT');

    expect(credit?.color).toBe('rose');
    expect(credit?.icon).toBe('credit-card');
  });
});
