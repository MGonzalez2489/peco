import {Column, Entity, Index, JoinColumn, ManyToOne} from 'typeorm';
import {BIGINT_COLUMN} from '../constants/bigint-column.constant';
import {UTC_TIMESTAMP_COLUMN} from '../constants/utc-timestamp-column.constant';
import {TimestampedEntity} from './timestamped.entity';
import {UserEntity} from './user.entity';

@Entity('refreshTokens')
@Index('UQRefreshTokensPublicId', ['publicId'], {unique: true})
@Index('IDXRefreshTokensUserIdExpiresAt', ['userId', 'expiresAt'])
export class RefreshTokenEntity extends TimestampedEntity {
  @Column({...BIGINT_COLUMN, unsigned: true})
  userId!: number;

  @Column({type: 'char', length: 64, charset: 'ascii', collation: 'ascii_bin'})
  tokenHash!: string;

  @Column(UTC_TIMESTAMP_COLUMN)
  expiresAt!: string;

  @Column({...UTC_TIMESTAMP_COLUMN, nullable: true})
  revokedAt!: string | null;

  @ManyToOne(() => UserEntity, {nullable: false, onDelete: 'RESTRICT'})
  @JoinColumn({name: 'userId', foreignKeyConstraintName: 'FKRefreshTokensUserId'})
  user!: UserEntity;
}
