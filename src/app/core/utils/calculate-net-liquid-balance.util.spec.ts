import {Account} from '../models/account.model';
import {calculateNetLiquidBalance} from './calculate-net-liquid-balance.util';

const buildAccount = (overrides: Partial<Account>): Account => ({
  id: crypto.randomUUID(),
  name: 'Cuenta',
  currentBalance: 0,
  type: 'CASH',
  includeInTotal: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('calculateNetLiquidBalance', () => {
  it('adds every included non-liability balance', () => {
    const balance = calculateNetLiquidBalance([
      buildAccount({type: 'CASH', currentBalance: 100}),
      buildAccount({type: 'DEBIT', currentBalance: 250}),
      buildAccount({type: 'SAVINGS', currentBalance: 400}),
    ]);

    expect(balance).toBe(750);
  });

  it('never subtracts credit card debt from the liquid balance', () => {
    const balance = calculateNetLiquidBalance([
      buildAccount({type: 'CASH', currentBalance: 1000}),
      buildAccount({type: 'CREDIT', currentBalance: -300}),
    ]);

    expect(balance).toBe(1000);
  });

  it('skips accounts excluded from the available total', () => {
    const balance = calculateNetLiquidBalance([
      buildAccount({type: 'CASH', currentBalance: 100}),
      buildAccount({type: 'SAVINGS', currentBalance: 500, includeInTotal: false}),
    ]);

    expect(balance).toBe(100);
  });
});
