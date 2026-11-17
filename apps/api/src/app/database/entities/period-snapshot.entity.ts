import {Column, Entity, Index, JoinColumn, ManyToOne, Unique} from 'typeorm';
import {BIGINT_COLUMN} from '../constants/bigint-column.constant';
import {CreatedEntity} from './created.entity';
import {UserEntity} from './user.entity';

@Entity('periodSnapshots')
@Index('UQPeriodSnapshotsPublicId', ['publicId'], {unique: true})
@Unique('UQPeriodSnapshotsUserIdPeriod', ['userId', 'period'])
export class PeriodSnapshotEntity extends CreatedEntity {
  @Column({...BIGINT_COLUMN, unsigned: true})
  userId!: number;

  @Column({type: 'char', length: 7, charset: 'ascii', collation: 'ascii_bin'})
  period!: string;

  @Column({type: 'date'})
  startDate!: string;

  @Column({type: 'date'})
  endDate!: string;

  @Column(BIGINT_COLUMN)
  globalInitialBalance!: number;

  @Column(BIGINT_COLUMN)
  globalFinalBalance!: number;

  @Column(BIGINT_COLUMN)
  totalInflows!: number;

  @Column(BIGINT_COLUMN)
  totalOutflows!: number;

  @Column(BIGINT_COLUMN)
  totalTransfers!: number;

  @Column({type: 'int', unsigned: true})
  totalTransactionsCount!: number;

  @ManyToOne(() => UserEntity, {nullable: false, onDelete: 'RESTRICT'})
  @JoinColumn({name: 'userId', foreignKeyConstraintName: 'FKPeriodSnapshotsUserId'})
  user!: UserEntity;
}
