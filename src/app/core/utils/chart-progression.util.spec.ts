import {Movement} from '../models/movement.model';
import {calculateEventDrivenProgression} from './chart-progression.util';

const buildMovement = (
  overrides: Partial<Movement> & Pick<Movement, 'type' | 'amount' | 'date'>,
): Movement => ({
  id: 'movement-1',
  accountId: 'account-1',
  categoryId: 'category-1',
  ...overrides,
});

describe('calculateEventDrivenProgression', () => {
  it('plots only event days plus the start and end anchors', () => {
    const movements: Movement[] = [
      buildMovement({type: 'EXPENSE', amount: 100, date: '2020-03-05'}),
      buildMovement({type: 'INCOME', amount: 300, date: '2020-03-05'}),
      buildMovement({type: 'EXPENSE', amount: 50, date: '2020-03-20'}),
    ];

    const points = calculateEventDrivenProgression(movements, 'account-1', 2020, 3, 1000);

    expect(points).toEqual([
      {x: '01 Mar', y: 1000},
      {x: '05 Mar', y: 1200},
      {x: '20 Mar', y: 1150},
      {x: '31 Mar', y: 1150},
    ]);
  });

  it('omits days without transactions and anchors-only when there are none', () => {
    const points = calculateEventDrivenProgression([], 'account-1', 2020, 3, 500);

    expect(points).toEqual([
      {x: '01 Mar', y: 500},
      {x: '31 Mar', y: 500},
    ]);
  });

  it('ignores canceled movements and movements from other accounts', () => {
    const movements: Movement[] = [
      buildMovement({type: 'EXPENSE', amount: 80, date: '2020-03-10', isCanceled: true}),
      buildMovement({type: 'INCOME', amount: 999, date: '2020-03-12', accountId: 'account-2'}),
    ];

    const points = calculateEventDrivenProgression(movements, 'account-1', 2020, 3, 200);

    expect(points).toEqual([
      {x: '01 Mar', y: 200},
      {x: '31 Mar', y: 200},
    ]);
  });

  it('applies transfer direction relative to the tracked account', () => {
    const movements: Movement[] = [
      buildMovement({
        type: 'TRANSFER',
        amount: 200,
        date: '2020-03-08',
        accountId: 'account-1',
        targetAccountId: 'account-2',
      }),
      buildMovement({
        type: 'TRANSFER',
        amount: 100,
        date: '2020-03-09',
        accountId: 'account-2',
        targetAccountId: 'account-1',
      }),
    ];

    const points = calculateEventDrivenProgression(movements, 'account-1', 2020, 3, 500);

    expect(points).toEqual([
      {x: '01 Mar', y: 500},
      {x: '08 Mar', y: 300},
      {x: '09 Mar', y: 400},
      {x: '31 Mar', y: 400},
    ]);
  });

  it('drops days whose net change is zero', () => {
    const movements: Movement[] = [
      buildMovement({type: 'INCOME', amount: 50, date: '2020-03-14'}),
      buildMovement({type: 'EXPENSE', amount: 50, date: '2020-03-14'}),
    ];

    const points = calculateEventDrivenProgression(movements, 'account-1', 2020, 3, 300);

    expect(points).toEqual([
      {x: '01 Mar', y: 300},
      {x: '31 Mar', y: 300},
    ]);
  });
});
