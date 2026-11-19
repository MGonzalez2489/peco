import {Column, Entity, Index, JoinColumn, ManyToOne} from 'typeorm';
import {BIGINT_COLUMN} from '../constants/bigint-column.constant';
import {UTC_TIMESTAMP_COLUMN} from '../constants/utc-timestamp-column.constant';
import {TimestampedEntity} from './timestamped.entity';
import {UserEntity} from './user.entity';

/**
 * Single-use password reset token (D85). Only the SHA-256 digest is stored;
 * `usedAt` marks both consumption and supersession by a newer request.
 */
@Entity('passwordResetTokens')
@Index('UQPasswordResetTokensPublicId', ['publicId'], {unique: true})
@Index('UQPasswordResetTokensTokenHash', ['tokenHash'], {unique: true})
@Index('IDXPasswordResetTokensUserIdExpiresAt', ['userId', 'expiresAt'])
export class PasswordResetTokenEntity extends TimestampedEntity {
  @Column({...BIGINT_COLUMN, unsigned: true})
  userId!: number;

  @Column({type: 'char', length: 64, charset: 'ascii', collation: 'ascii_bin'})
  tokenHash!: string;

  @Column(UTC_TIMESTAMP_COLUMN)
  expiresAt!: string;

  @Column({...UTC_TIMESTAMP_COLUMN, nullable: true})
  usedAt!: string | null;

  @ManyToOne(() => UserEntity, {nullable: false, onDelete: 'RESTRICT'})
  @JoinColumn({name: 'userId', foreignKeyConstraintName: 'FKPasswordResetTokensUserId'})
  user!: UserEntity;
}
