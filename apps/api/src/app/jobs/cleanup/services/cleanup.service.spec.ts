import {JobKeyEnum, JobStatusEnum} from '@peco/enums';
import type {AppConfig} from '../../../config/app-config';
import {ConfigService} from '../../../config/config.service';
import type {UtcClock} from '../../../database/clock/utc-clock';
import type {JobLockService} from '../../../common/job-locks/job-lock.service';
import type {MetricsService} from '../../../common/observability/metrics.service';
import type {CleanupResult} from '../types/cleanup-result.type';
import type {CleanupRepository} from './cleanup.repository';
import {CleanupService} from './cleanup.service';

const NOW = '2026-11-25T04:00:00.000Z';

const config = (): ConfigService =>
  new ConfigService({
    operational: {cleanupBatchSize: 1000, auditLogRetentionDays: 730},
  } as AppConfig);

const clock = (): UtcClock => ({now: () => NOW}) as UtcClock;

const clean = (): CleanupResult => ({
  acquired: true,
  idempotencyKeys: 2,
  refreshTokens: 1,
  auditLogs: 3,
});

describe('CleanupService', () => {
  it('runs the sweep and records a successful job metric', async () => {
    const repository = {
      purgeExpiredIdempotencyKeys: jest.fn(async () => 2),
      purgeStaleRefreshTokens: jest.fn(async () => 1),
      purgeOldAuditLogs: jest.fn(async () => 3),
    } as unknown as CleanupRepository;
    const metrics = {
      recordJobRun: jest.fn(),
    } as unknown as MetricsService;

    const result = await new CleanupService(
      repository,
      config(),
      clock(),
      undefined,
      metrics,
    ).run();

    expect(result).toEqual(clean());
    expect(repository.purgeExpiredIdempotencyKeys).toHaveBeenCalledWith(NOW, 1000);
    expect(repository.purgeStaleRefreshTokens).toHaveBeenCalledWith(NOW, 1000);
    expect(repository.purgeOldAuditLogs).toHaveBeenCalledWith('2024-11-25T04:00:00.000Z', 1000);
    expect(metrics.recordJobRun).toHaveBeenCalledWith(
      JobKeyEnum.CLEANUP.toString(),
      JobStatusEnum.SUCCESS.toString(),
      expect.any(Number),
    );
  });

  it('skips when another instance holds the durable lock', async () => {
    const repository = {
      purgeExpiredIdempotencyKeys: jest.fn(),
      purgeStaleRefreshTokens: jest.fn(),
      purgeOldAuditLogs: jest.fn(),
    } as unknown as CleanupRepository;
    const jobLocks = {
      withLock: jest.fn(async () => null),
    } as unknown as JobLockService;
    const metrics = {
      recordJobRun: jest.fn(),
    } as unknown as MetricsService;

    const result = await new CleanupService(repository, config(), clock(), jobLocks, metrics).run();

    expect(result).toEqual({
      acquired: false,
      idempotencyKeys: 0,
      refreshTokens: 0,
      auditLogs: 0,
    });
    expect(repository.purgeExpiredIdempotencyKeys).not.toHaveBeenCalled();
    expect(jobLocks.withLock).toHaveBeenCalledWith(
      JobKeyEnum.CLEANUP.toString(),
      expect.any(Function),
    );
    expect(metrics.recordJobRun).toHaveBeenCalledWith(
      JobKeyEnum.CLEANUP.toString(),
      JobStatusEnum.SKIPPED.toString(),
      expect.any(Number),
    );
  });
});
