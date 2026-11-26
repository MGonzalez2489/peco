import {Column, Entity, Index} from 'typeorm';
import {UTC_TIMESTAMP_COLUMN} from '../constants/utc-timestamp-column.constant';
import {TimestampedEntity} from './timestamped.entity';

/** Durable single-flight row for one scheduled job key (12/US-1001). */
@Entity('jobLocks')
@Index('UQJobLocksPublicId', ['publicId'], {unique: true})
@Index('UQJobLocksJobKey', ['jobKey'], {unique: true})
export class JobLockEntity extends TimestampedEntity {
  @Column({type: 'varchar', length: 64, charset: 'ascii', collation: 'ascii_bin'})
  jobKey!: string;

  @Column({type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin'})
  lockToken!: string;

  @Column(UTC_TIMESTAMP_COLUMN)
  expiresAt!: string;
}
