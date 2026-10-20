import {Account} from '../models/account.model';
import {groupAccountsByType} from './group-accounts-by-type.util';

const buildAccount = (overrides: Partial<Account>): Account => ({
  id: crypto.randomUUID(),
  name: 'Cuenta',
  currentBalance: 0,
  type: 'CASH',
  includeInTotal: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('groupAccountsByType', () => {
  it('returns an empty summary when there are no accounts', () => {
    expect(groupAccountsByType([])).toEqual([]);
  });

  it('only includes account types that are present', () => {
    const summaries = groupAccountsByType([
      buildAccount({type: 'CASH'}),
      buildAccount({type: 'CREDIT', currentBalance: -500}),
    ]);

    expect(summaries.map((summary) => summary.type)).toEqual(['CASH', 'CREDIT']);
  });

  it('aggregates counts and signed totals per account type', () => {
    const summaries = groupAccountsByType([
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
    const summaries = groupAccountsByType([
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
    const [summary] = groupAccountsByType([buildAccount({type: 'CREDIT'})]);

    expect(summary.color).toBe('rose');
    expect(summary.icon).toBe('credit-card');
  });
});
