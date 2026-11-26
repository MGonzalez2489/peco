import {Injectable, Optional} from '@nestjs/common';
import {JobKeyEnum} from '@peco/enums';
import {DataSource} from 'typeorm';
import {JobLockService} from '../../../common/job-locks/job-lock.service';
import {UserEntity} from '../../../database/entities';
import {AUTO_APPLY_LOCK_NAME} from '../constants/auto-apply-lock-name.constant';

/** Run lock plus the D58-filtered user queue for the auto-apply job (12/D58). */
@Injectable()
export class AutoApplyRepository {
  constructor(
    private readonly dataSource: DataSource,
    @Optional() private readonly jobLocks?: JobLockService,
  ) {}

  /** Durable lock first, then the advisory lock that existing integration tests assert. */
  async withLock<T>(work: () => Promise<T>): Promise<T | null> {
    const withAdvisoryLock = async (): Promise<T | null> => this.withAdvisoryLock(work);
    return this.jobLocks
      ? this.jobLocks.withLock(JobKeyEnum.AUTO_APPLY.toString(), withAdvisoryLock)
      : withAdvisoryLock();
  }

  private async withAdvisoryLock<T>(work: () => Promise<T>): Promise<T | null> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      const rows = (await queryRunner.query('SELECT GET_LOCK(?, 0) AS acquired', [
        AUTO_APPLY_LOCK_NAME,
      ])) as {acquired: unknown}[];
      if (Number(rows[0]?.acquired) !== 1) {
        return null;
      }

      return await work();
    } finally {
      await queryRunner.query('SELECT RELEASE_LOCK(?)', [AUTO_APPLY_LOCK_NAME]);
      await queryRunner.release();
    }
  }

  /** Recently active users with at least one due schedule opted into auto-apply. */
  findEligibleUserPublicIds(
    activeSince: string,
    asOf: string,
  ): Promise<{publicId: string}[]> {
    return this.dataSource
      .getRepository(UserEntity)
      .createQueryBuilder('user')
      .select('user.publicId', 'publicId')
      .where('user.deletedAt IS NULL')
      .andWhere('user.lastActiveAt >= :activeSince', {activeSince})
      .andWhere(
        `EXISTS (
          SELECT 1 FROM scheduledTransactions schedule
          WHERE schedule.userId = user.id
            AND schedule.deletedAt IS NULL
            AND schedule.active = 1
            AND schedule.autoApply = 1
            AND schedule.nextExecutionDate <= :asOf
        )`,
        {asOf},
      )
      .orderBy('user.id', 'ASC')
      .getRawMany<{publicId: string}>();
  }
}
