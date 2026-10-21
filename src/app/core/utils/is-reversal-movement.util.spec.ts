import {Movement} from '../models/movement.model';
import {isReversalMovement} from './is-reversal-movement.util';

describe('isReversalMovement', () => {
  const movement = (overrides: Partial<Movement> = {}): Movement => ({
    id: 'movement-id',
    accountId: 'account-id',
    categoryId: 'category-id',
    type: 'EXPENSE',
    amount: 100,
    date: '2026-01-01T00:00:00.000Z',
    ...overrides,
  });

  it('returns false for a regular movement', () => {
    expect(isReversalMovement(movement())).toBe(false);
  });

  it('detects a reverted movement flagged with isReversal', () => {
    expect(isReversalMovement(movement({isReversal: true}))).toBe(true);
  });

  it('detects the contra-movement that points back to the original', () => {
    expect(isReversalMovement(movement({reversalId: 'original-id'}))).toBe(true);
  });

  it('returns false when the flags are explicitly false', () => {
    expect(isReversalMovement(movement({isReversal: false, reversalId: undefined}))).toBe(false);
  });
});
