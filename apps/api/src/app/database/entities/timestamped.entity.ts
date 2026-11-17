import {Column} from 'typeorm';
import {UTC_TIMESTAMP_COLUMN} from '../constants/utc-timestamp-column.constant';
import {BaseEntity} from './base.entity';

/**
 * Tables with a lifecycle but no soft delete (7.2). Both values are UTC ISO-8601
 * strings written by `BaseEntitySubscriber`; no TypeORM date decorator is used.
 */
export abstract class TimestampedEntity extends BaseEntity {
  @Column(UTC_TIMESTAMP_COLUMN)
  createdAt!: string;

  @Column(UTC_TIMESTAMP_COLUMN)
  updatedAt!: string;
}
