import {Column} from 'typeorm';
import {UTC_TIMESTAMP_COLUMN} from '../constants/utc-timestamp-column.constant';
import {BaseEntity} from './base.entity';

/** Immutable or append-only row that records only its creation time (7.2, D8). */
export abstract class CreatedEntity extends BaseEntity {
  @Column(UTC_TIMESTAMP_COLUMN)
  createdAt!: string;
}
