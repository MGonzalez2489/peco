import {Column} from 'typeorm';
import {UTC_TIMESTAMP_COLUMN} from '../constants/utc-timestamp-column.constant';
import {TimestampedEntity} from './timestamped.entity';

/**
 * CRUD tables (7.2). Soft delete is an explicit `deletedAt` update performed by
 * the service, not TypeORM's `@DeleteDateColumn`.
 */
export abstract class SoftDeletableEntity extends TimestampedEntity {
  @Column({...UTC_TIMESTAMP_COLUMN, nullable: true})
  deletedAt!: string | null;
}
