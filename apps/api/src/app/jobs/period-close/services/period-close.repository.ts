import {Injectable} from '@nestjs/common';
import {DataSource} from 'typeorm';
import {UserEntity} from '../../../database/entities';
import {PERIOD_CLOSE_LOCK_NAME} from '../constants/period-close-lock-name.constant';

/** Run lock and D58-filtered user queue for the period-close job (12/D58). */
@Injectable()
export class PeriodCloseRepository {
  constructor(private readonly dataSource: DataSource) {}

  /** Returns `null` when another API instance already holds the run lock. */
  async withLock<T>(work: () => Promise<T>): Promise<T | null> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      const rows = (await queryRunner.query('SELECT GET_LOCK(?, 0) AS acquired', [
        PERIOD_CLOSE_LOCK_NAME,
      ])) as {acquired: unknown}[];
      if (Number(rows[0]?.acquired) !== 1) {
        return null;
      }

      return await work();
    } finally {
      await queryRunner.query('SELECT RELEASE_LOCK(?)', [PERIOD_CLOSE_LOCK_NAME]);
      await queryRunner.release();
    }
  }

  /** Recently active users whose months are eligible for closing. */
  findActiveUserPublicIds(activeSince: string): Promise<{publicId: string}[]> {
    return this.dataSource
      .getRepository(UserEntity)
      .createQueryBuilder('user')
      .select('user.publicId', 'publicId')
      .where('user.deletedAt IS NULL')
      .andWhere('user.lastActiveAt >= :activeSince', {activeSince})
      .orderBy('user.id', 'ASC')
      .getRawMany<{publicId: string}>();
  }
}
