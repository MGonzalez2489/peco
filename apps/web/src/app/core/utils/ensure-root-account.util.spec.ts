import {Account} from '../models/account.model';
import {ensureRootAccount} from './ensure-root-account.util';

interface LegacyAccount {
  id: string;
  name: string;
  currentBalance: number;
  type: unknown;
  includeInTotal?: boolean;
  createdAt?: string;
  isRoot?: boolean;
}

const legacyAccount = (overrides: Partial<LegacyAccount> = {}): LegacyAccount => ({
  id: 'legacy-1',
  name: 'Cuenta heredada',
  currentBalance: 100,
  type: {key: 'CREDIT', name: 'Crédito', color: 'rose', icon: 'credit-card'},
  ...overrides,
});

describe('ensureRootAccount', () => {
  it('keeps canonical account types untouched', () => {
    const account: Account = {
      id: 'account-1',
      name: 'Efectivo',
      currentBalance: 0,
      type: 'CASH',
      includeInTotal: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      isRoot: true,
    };

    expect(ensureRootAccount([account])).toEqual([account]);
  });

  it('migrates legacy object types to their semantic key', () => {
    const [account] = ensureRootAccount([legacyAccount() as unknown as Account]);

    expect(account.type).toBe('CREDIT');
  });

  it('falls back to cash when the legacy type is unknown', () => {
    const [account] = ensureRootAccount([
      legacyAccount({type: {key: 'UNKNOWN'}}) as unknown as Account,
    ]);

    expect(account.type).toBe('CASH');
  });

  it('fills missing flags and marks the first account as root', () => {
    const [account] = ensureRootAccount([legacyAccount() as unknown as Account]);

    expect(account.includeInTotal).toBe(true);
    expect(account.createdAt).toBeDefined();
    expect(account.isRoot).toBe(true);
  });
});
