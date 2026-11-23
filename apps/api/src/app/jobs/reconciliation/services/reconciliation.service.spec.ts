import type {EntityManager} from 'typeorm';
import type {AppConfig} from '../../../config/app-config';
import {ConfigService} from '../../../config/config.service';
import type {UtcClock} from '../../../database/clock/utc-clock';
import type {ReconciliationAccount} from '../types/reconciliation-account.type';
import {ReconciliationAlertService} from './reconciliation-alert.service';
import {ReconciliationMetricsService} from './reconciliation-metrics.service';
import type {ReconciliationRepository} from './reconciliation.repository';
import {ReconciliationService} from './reconciliation.service';

const NOW = '2026-11-22T03:00:00.000Z';

const configService = (inactiveUserDays: number): ConfigService =>
  new ConfigService({
    operational: {inactiveUserDays},
  } as AppConfig);

const account = (overrides: Partial<ReconciliationAccount> = {}): ReconciliationAccount => ({
  id: 1,
  publicId: '11111111-1111-4111-8111-111111111111',
  userId: 10,
  initialBalance: 100_000,
  currentBalance: 100_000,
  ...overrides,
});

describe('ReconciliationService', () => {
  const clock = {now: jest.fn(() => NOW)} as unknown as UtcClock;

  const build = (
    repository: ReconciliationRepository,
    metrics = new ReconciliationMetricsService(),
    alerts = {drift: jest.fn()} as unknown as ReconciliationAlertService,
  ) => ({
    metrics,
    alerts,
    service: new ReconciliationService(configService(90), clock, repository, metrics, alerts),
  });

  const withAccounts = (
    accounts: ReconciliationAccount[],
    impacts: Map<number, number> = new Map(),
  ): ReconciliationRepository =>
    ({
      withLock: jest.fn((work: (manager: EntityManager) => Promise<unknown>) =>
        work({} as EntityManager),
      ),
      findEligibleAccounts: jest.fn(async (_manager: EntityManager, activeSince: string) => {
        expect(activeSince).toBe('2026-08-24T03:00:00.000Z');
        return accounts;
      }),
      readMovementImpacts: jest.fn(async () => impacts),
      saveDrifts: jest.fn(async () => undefined),
    }) as unknown as ReconciliationRepository;

  it('returns no alerts for a correct ledger', async () => {
    const repository = withAccounts([account({currentBalance: 105_000})], new Map([[1, 5_000]]));
    const {service, metrics, alerts} = build(repository);

    const result = await service.reconcile();

    expect(result).toEqual({acquired: true, scannedAccounts: 1, mismatches: 0});
    expect(repository.saveDrifts).toHaveBeenCalledWith(expect.anything(), []);
    expect(metrics.snapshot().value).toBe(0);
    expect(alerts.drift).not.toHaveBeenCalled();
  });

  it('reports drift without correcting the stored balance', async () => {
    const drifted = account({currentBalance: 99_900});
    const repository = withAccounts([drifted]);
    const {service, metrics, alerts} = build(repository);

    const result = await service.reconcile();

    expect(result).toEqual({acquired: true, scannedAccounts: 1, mismatches: 1});
    expect(repository.saveDrifts).toHaveBeenCalledWith(expect.anything(), [
      {
        userId: 10,
        accountPublicId: drifted.publicId,
        expectedBalance: 100_000,
        currentBalance: 99_900,
        delta: 100,
      },
    ]);
    expect(metrics.snapshot().value).toBe(1);
    expect(alerts.drift).toHaveBeenCalledTimes(1);
  });

  it('does not emit metrics or alerts when the run lock is busy', async () => {
    const repository = {
      withLock: jest.fn(async () => null),
    } as unknown as ReconciliationRepository;
    const {service, metrics, alerts} = build(repository);

    const result = await service.reconcile();

    expect(result).toEqual({acquired: false, scannedAccounts: 0, mismatches: 0});
    expect(metrics.snapshot().value).toBe(0);
    expect(alerts.drift).not.toHaveBeenCalled();
  });
});
