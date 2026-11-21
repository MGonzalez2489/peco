import {DataSource} from 'typeorm';
import {UtcClock} from '../../database/clock/utc-clock';
import {MovementCreationRepository} from './movement-creation.repository';

const RESULT = {status: 'created'} as never;

const deadlock = (): Error =>
  Object.assign(new Error('Deadlock found when trying to get lock'), {
    code: 'ER_LOCK_DEADLOCK',
    errno: 1213,
  });

describe('MovementCreationRepository deadlock retry (D49/US-501)', () => {
  let transaction: jest.Mock;
  let repository: MovementCreationRepository;

  beforeEach(() => {
    transaction = jest.fn();
    repository = new MovementCreationRepository(
      {transaction} as unknown as DataSource,
      new UtcClock(),
    );
  });

  it('retries a deadlock and returns the successful transaction result', async () => {
    transaction.mockRejectedValueOnce(deadlock()).mockResolvedValueOnce(RESULT);

    await expect(
      repository.create(42, {
        type: 'INCOME',
        amount: 3000,
        accountPublicId: 'source-account',
      }),
    ).resolves.toBe(RESULT);

    expect(transaction).toHaveBeenCalledTimes(2);
    expect(transaction).toHaveBeenCalledWith('READ COMMITTED', expect.any(Function));
  });

  it('stops after three deadlocked attempts', async () => {
    transaction.mockRejectedValue(deadlock());

    await expect(
      repository.create(42, {
        type: 'INCOME',
        amount: 3000,
        accountPublicId: 'source-account',
      }),
    ).rejects.toMatchObject({code: 'ER_LOCK_DEADLOCK'});

    expect(transaction).toHaveBeenCalledTimes(3);
  });

  it('does not retry a non-deadlock failure', async () => {
    const failure = new Error('connection lost');
    transaction.mockRejectedValue(failure);

    await expect(
      repository.create(42, {
        type: 'INCOME',
        amount: 3000,
        accountPublicId: 'source-account',
      }),
    ).rejects.toBe(failure);

    expect(transaction).toHaveBeenCalledTimes(1);
  });
});
