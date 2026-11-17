import {AppTheme} from '@peco/contracts';
import {Column, Entity, Index, JoinColumn, ManyToOne, Unique} from 'typeorm';
import {BIGINT_COLUMN} from '../constants/bigint-column.constant';
import {ENUM_COLUMN} from '../constants/enum-column.constant';
import {UTC_TIMESTAMP_COLUMN} from '../constants/utc-timestamp-column.constant';
import {TimestampedEntity} from './timestamped.entity';
import {UserEntity} from './user.entity';

@Entity('userPreferences')
@Index('UQUserPreferencesPublicId', ['publicId'], {unique: true})
@Unique('UQUserPreferencesUserId', ['userId'])
export class UserPreferencesEntity extends TimestampedEntity {
  @Column({...BIGINT_COLUMN, unsigned: true})
  userId!: number;

  @Column(ENUM_COLUMN)
  theme!: AppTheme;

  @Column({...UTC_TIMESTAMP_COLUMN, nullable: true})
  pwaBannerDismissedAt!: string | null;

  @Column({type: 'boolean', default: false})
  hideBalance!: boolean;

  @Column({type: 'boolean', default: false})
  hideReversal!: boolean;

  @ManyToOne(() => UserEntity, {nullable: false, onDelete: 'RESTRICT'})
  @JoinColumn({name: 'userId', foreignKeyConstraintName: 'FKUserPreferencesUserId'})
  user!: UserEntity;
}
