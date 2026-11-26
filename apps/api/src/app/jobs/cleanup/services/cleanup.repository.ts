import {Injectable} from '@nestjs/common';
import {DataSource} from 'typeorm';

type RetentionTable = 'idempotencyKeys' | 'refreshTokens' | 'auditLogs';

type StructuredDeleteResult = {affected?: number};

/** Bounded raw deletes: TypeORM 1.1.3 does not emit `LIMIT` for delete queries. */
@Injectable()
export class CleanupRepository {
  constructor(private readonly dataSource: DataSource) {}

  purgeExpiredIdempotencyKeys(now: string, batchSize: number): Promise<number> {
    return this.purge('idempotencyKeys', '`expiresAt` <= ?', [now], batchSize);
  }

  purgeStaleRefreshTokens(now: string, batchSize: number): Promise<number> {
    return this.purge(
      'refreshTokens',
      '(`revokedAt` IS NOT NULL OR `expiresAt` <= ?)',
      [now],
      batchSize,
    );
  }

  purgeOldAuditLogs(cutoff: string, batchSize: number): Promise<number> {
    return this.purge('auditLogs', '`createdAt` < ?', [cutoff], batchSize);
  }

  private async purge(
    table: RetentionTable,
    predicate: string,
    parameters: readonly string[],
    batchSize: number,
  ): Promise<number> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      let deleted = 0;
      for (;;) {
        const result = (await queryRunner.query(
          `DELETE FROM \`${table}\` WHERE ${predicate} LIMIT ?`,
          [...parameters, batchSize],
          true,
        )) as StructuredDeleteResult;
        const affected = Number(result.affected ?? 0);
        deleted += affected;
        if (affected < batchSize) {
          return deleted;
        }
      }
    } finally {
      await queryRunner.release();
    }
  }
}
