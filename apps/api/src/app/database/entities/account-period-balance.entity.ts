import {AccountType} from '@peco/contracts';
import {Column, Entity, Index, JoinColumn, ManyToOne, Unique} from 'typeorm';
import {BIGINT_COLUMN} from '../constants/bigint-column.constant';
import {ENUM_COLUMN} from '../constants/enum-column.constant';
import {BaseEntity} from './base.entity';
import {AccountEntity} from './account.entity';
import {PeriodSnapshotEntity} from './period-snapshot.entity';

@Entity('accountPeriodBalances')
@Index('UQAccountPeriodBalancesPublicId', ['publicId'], {unique: true})
@Unique('UQAccountPeriodBalancesSnapshotIdAccountId', ['snapshotId', 'accountId'])
export class AccountPeriodBalanceEntity extends BaseEntity {
  @Column({...BIGINT_COLUMN, unsigned: true})
  snapshotId!: number;

  @Column({...BIGINT_COLUMN, unsigned: true})
  accountId!: number;

  @Column({type: 'varchar', length: 80})
  accountName!: string;

  @Column(ENUM_COLUMN)
  accountType!: AccountType;

  @Column({
    type: 'char',
    length: 7,
    charset: 'ascii',
    collation: 'ascii_bin',
    nullable: true,
  })
  color!: string | null;

  @Column({type: 'varchar', length: 40, nullable: true})
  icon!: string | null;

  @Column({type: 'boolean'})
  includeInTotal!: boolean;

  @Column(BIGINT_COLUMN)
  initialBalance!: number;

  @Column(BIGINT_COLUMN)
  finalBalance!: number;

  @Column({type: 'int', unsigned: true})
  totalTransactions!: number;

  @Column(BIGINT_COLUMN)
  totalInflows!: number;

  @Column(BIGINT_COLUMN)
  totalOutflows!: number;

  @Column(BIGINT_COLUMN)
  totalTransfers!: number;

  @ManyToOne(() => PeriodSnapshotEntity, {nullable: false, onDelete: 'CASCADE'})
  @JoinColumn({
    name: 'snapshotId',
    foreignKeyConstraintName: 'FKAccountPeriodBalancesSnapshotId',
  })
  snapshot!: PeriodSnapshotEntity;

  @ManyToOne(() => AccountEntity, {nullable: false, onDelete: 'RESTRICT'})
  @JoinColumn({
    name: 'accountId',
    foreignKeyConstraintName: 'FKAccountPeriodBalancesAccountId',
  })
  account!: AccountEntity;
}
