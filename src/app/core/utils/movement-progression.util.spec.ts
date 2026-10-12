import {Movement} from '../models/movement.model';
import {calculateMovementProgression} from './movement-progression.util';

const buildMovement = (
  overrides: Partial<Movement> & Pick<Movement, 'type' | 'amount' | 'date'>,
): Movement => ({
  id: 'movement-1',
  accountId: 'account-1',
  categoryId: 'category-1',
  ...overrides,
});

describe('calculateMovementProgression', () => {
  it('accumulates the net flow from zero on event days plus the start and end anchors', () => {
    const movements: Movement[] = [
      buildMovement({type: 'INCOME', amount: 300, date: '2020-03-05'}),
      buildMovement({type: 'EXPENSE', amount: 100, date: '2020-03-05'}),
      buildMovement({type: 'EXPENSE', amount: 50, date: '2020-03-20'}),
    ];

    const points = calculateMovementProgression(movements, 2020, 3);

    expect(points).toEqual([
      {x: '01 Mar', y: 0},
      {x: '05 Mar', y: 200},
      {x: '20 Mar', y: 150},
      {x: '31 Mar', y: 150},
    ]);
  });

  it('omits days without transactions and anchors-only when there are none', () => {
    const points = calculateMovementProgression([], 2020, 3);

    expect(points).toEqual([
      {x: '01 Mar', y: 0},
      {x: '31 Mar', y: 0},
    ]);
  });

  it('ignores canceled movements and transfers', () => {
    const movements: Movement[] = [
      buildMovement({type: 'EXPENSE', amount: 80, date: '2020-03-10', isCanceled: true}),
      buildMovement({
        type: 'TRANSFER',
        amount: 500,
        date: '2020-03-12',
        targetAccountId: 'account-2',
      }),
    ];

    const points = calculateMovementProgression(movements, 2020, 3);

    expect(points).toEqual([
      {x: '01 Mar', y: 0},
      {x: '31 Mar', y: 0},
    ]);
  });

  it('drops days whose net change is zero', () => {
    const movements: Movement[] = [
      buildMovement({type: 'INCOME', amount: 50, date: '2020-03-14'}),
      buildMovement({type: 'EXPENSE', amount: 50, date: '2020-03-14'}),
    ];

    const points = calculateMovementProgression(movements, 2020, 3);

    expect(points).toEqual([
      {x: '01 Mar', y: 0},
      {x: '31 Mar', y: 0},
    ]);
  });
});
