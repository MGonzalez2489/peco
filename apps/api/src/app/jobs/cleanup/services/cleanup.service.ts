import {Injectable, Optional} from '@nestjs/common';
import {JobKeyEnum, JobStatusEnum, type StringEnumValues} from '@peco/enums';
import {JobLockService} from '../../../common/job-locks/job-lock.service';
import {MetricsService} from '../../../common/observability/metrics.service';
import {ConfigService} from '../../../config/config.service';
import {UtcClock} from '../../../database/clock/utc-clock';
import type {CleanupResult} from '../types/cleanup-result.type';
import {CleanupRepository} from './cleanup.repository';

type JobStatus = StringEnumValues<typeof JobStatusEnum>;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const emptyResult = (acquired = false): CleanupResult => ({
  acquired,
  idempotencyKeys: 0,
  refreshTokens: 0,
  auditLogs: 0,
});

/** Daily retention sweep with bounded, idempotent deletes (US-1003/D19/D22/D24). */
@Injectable()
export class CleanupService {
  constructor(
    private readonly repository: CleanupRepository,
    private readonly configService: ConfigService,
    private readonly clock: UtcClock,
    @Optional() private readonly jobLocks?: JobLockService,
    @Optional() private readonly metrics?: MetricsService,
  ) {}

  async run(): Promise<CleanupResult> {
    const startedAt = process.hrtime.bigint();
    const jobKey = JobKeyEnum.CLEANUP.toString();
    const finish = (status: JobStatus, result: CleanupResult): CleanupResult => {
      this.metrics?.recordJobRun(
        jobKey,
        status,
        Number(process.hrtime.bigint() - startedAt) / 1_000_000,
      );
      return result;
    };

    const work = async (): Promise<CleanupResult> => {
      const now = this.clock.now();
      const {cleanupBatchSize = 1000, auditLogRetentionDays = 730} =
        this.configService.config.operational;
      const cutoff = new Date(Date.parse(now) - auditLogRetentionDays * MS_PER_DAY).toISOString();

      return {
        acquired: true,
        idempotencyKeys: await this.repository.purgeExpiredIdempotencyKeys(now, cleanupBatchSize),
        refreshTokens: await this.repository.purgeStaleRefreshTokens(now, cleanupBatchSize),
        auditLogs: await this.repository.purgeOldAuditLogs(cutoff, cleanupBatchSize),
      };
    };

    const result = this.jobLocks ? await this.jobLocks.withLock(jobKey, work) : await work();
    if (result === null) {
      return finish(JobStatusEnum.SKIPPED.toString(), emptyResult());
    }
    return finish(JobStatusEnum.SUCCESS.toString(), result);
  }
}
