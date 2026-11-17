import {Column, Entity, Index, JoinColumn, ManyToOne, Unique} from 'typeorm';
import {BIGINT_COLUMN} from '../constants/bigint-column.constant';
import {UTC_TIMESTAMP_COLUMN} from '../constants/utc-timestamp-column.constant';
import {TimestampedEntity} from './timestamped.entity';
import {UserEntity} from './user.entity';

@Entity('idempotencyKeys')
@Index('UQIdempotencyKeysPublicId', ['publicId'], {unique: true})
@Unique('UQIdempotencyKeysUserIdKey', ['userId', 'key'])
@Index('IDXIdempotencyKeysExpiresAt', ['expiresAt'])
export class IdempotencyKeyEntity extends TimestampedEntity {
  @Column({...BIGINT_COLUMN, unsigned: true})
  userId!: number;

  @Column({type: 'varchar', length: 128})
  key!: string;

  @Column({type: 'varchar', length: 200})
  endpoint!: string;

  @Column({type: 'char', length: 64, charset: 'ascii', collation: 'ascii_bin'})
  requestHash!: string;

  @Column({type: 'smallint', unsigned: true})
  responseStatus!: number;

  @Column({type: 'json', nullable: true})
  responseBody!: Record<string, unknown> | null;

  @Column(UTC_TIMESTAMP_COLUMN)
  expiresAt!: string;

  @ManyToOne(() => UserEntity, {nullable: false, onDelete: 'RESTRICT'})
  @JoinColumn({name: 'userId', foreignKeyConstraintName: 'FKIdempotencyKeysUserId'})
  user!: UserEntity;
}
