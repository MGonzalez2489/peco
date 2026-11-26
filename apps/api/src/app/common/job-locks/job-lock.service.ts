import {Injectable} from '@nestjs/common';
import {randomUUID} from 'node:crypto';
import {DataSource} from 'typeorm';
import {ConfigService} from '../../config/config.service';
import {UtcClock} from '../../database/clock/utc-clock';
import {runWithCorrelationId} from '../middleware/correlation-id.context';
import {runWithJobKey, type JobKey} from '../observability/job-context';

type StructuredUpdateResult = {affected?: number};

/** Durable single-flight lock with expiry, wrapped around the advisory locks (12/US-1001). */
@Injectable()
export class JobLockService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly clock: UtcClock,
    private readonly configService: ConfigService,
  ) {}

  /** Returns `null` when another instance holds the lock; the lock is always released. */
  async withLock<T>(jobKey: JobKey, work: () => Promise<T>): Promise<T | null> {
    const token = randomUUID();
    if (!(await this.acquire(jobKey, token))) {
      return null;
    }

    const correlationId = randomUUID();
    try {
      return await runWithCorrelationId(correlationId, () => runWithJobKey(jobKey, work));
    } finally {
      await this.release(jobKey, token);
    }
  }

  private async acquire(jobKey: JobKey, token: string): Promise<boolean> {
    const now = this.clock.now();
    const expiresAt = this.clock.plusSeconds(this.ttlSeconds());
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      const reclaimed = (await queryRunner.query(
        `UPDATE \`jobLocks\`
         SET \`lockToken\` = ?, \`expiresAt\` = ?, \`updatedAt\` = ?
         WHERE \`jobKey\` = ? AND \`expiresAt\` <= ?`,
        [token, expiresAt, now, jobKey, now],
        true,
      )) as StructuredUpdateResult;
      if (Number(reclaimed.affected ?? 0) > 0) {
        return true;
      }

      const inserted = (await queryRunner.query(
        `INSERT IGNORE INTO \`jobLocks\`
           (\`publicId\`, \`createdAt\`, \`updatedAt\`, \`jobKey\`, \`lockToken\`, \`expiresAt\`)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [randomUUID(), now, now, jobKey, token, expiresAt],
        true,
      )) as StructuredUpdateResult;
      return Number(inserted.affected ?? 0) > 0;
    } finally {
      await queryRunner.release();
    }
  }

  private async release(jobKey: JobKey, token: string): Promise<void> {
    await this.dataSource.query('DELETE FROM `jobLocks` WHERE `jobKey` = ? AND `lockToken` = ?', [
      jobKey,
      token,
    ]);
  }

  private ttlSeconds(): number {
    return this.configService.config.jobs?.jobLockTtlSeconds ?? 300;
  }
}
