import {RecurrenceFrequency, ScheduledTransactionType} from '@peco/contracts';
import {Column, Entity, Index, JoinColumn, ManyToOne} from 'typeorm';
import {BIGINT_COLUMN} from '../constants/bigint-column.constant';
import {ENUM_COLUMN} from '../constants/enum-column.constant';
import {SoftDeletableEntity} from './soft-deletable.entity';
import {AccountEntity} from './account.entity';
import {CategoryEntity} from './category.entity';
import {UserEntity} from './user.entity';

@Entity('scheduledTransactions')
@Index('UQScheduledTransactionsPublicId', ['publicId'], {unique: true})
@Index('IDXScheduledTransactionsUserIdActiveNextExecutionDate', [
  'userId',
  'active',
  'nextExecutionDate',
])
export class ScheduledTransactionEntity extends SoftDeletableEntity {
  @Column({...BIGINT_COLUMN, unsigned: true})
  userId!: number;

  @Column({type: 'varchar', length: 80})
  name!: string;

  @Column(BIGINT_COLUMN)
  estimatedAmount!: number;

  @Column(ENUM_COLUMN)
  type!: ScheduledTransactionType;

  @Column({...BIGINT_COLUMN, unsigned: true})
  categoryId!: number;

  @Column({...BIGINT_COLUMN, unsigned: true})
  sourceAccountId!: number;

  @Column({...BIGINT_COLUMN, unsigned: true, nullable: true})
  destinationAccountId!: number | null;

  @Column(ENUM_COLUMN)
  frequency!: RecurrenceFrequency;

  @Column({type: 'int', unsigned: true, default: 1})
  interval!: number;

  @Column({type: 'date'})
  anchorDate!: string;

  @Column({type: 'date'})
  nextContemplatedDate!: string;

  @Column({type: 'date'})
  nextExecutionDate!: string;

  @Column({type: 'boolean', default: false})
  autoApply!: boolean;

  @Column({type: 'boolean', default: true})
  active!: boolean;

  @Column({type: 'int', unsigned: true, nullable: true})
  totalOccurrences!: number | null;

  @Column({type: 'int', unsigned: true, default: 0})
  completedOccurrences!: number;

  @Column({type: 'date', nullable: true})
  endDate!: string | null;

  @Column({type: 'int', unsigned: true, default: 0})
  version!: number;

  @ManyToOne(() => UserEntity, {nullable: false, onDelete: 'RESTRICT'})
  @JoinColumn({name: 'userId', foreignKeyConstraintName: 'FKScheduledTransactionsUserId'})
  user!: UserEntity;

  @ManyToOne(() => CategoryEntity, {nullable: false, onDelete: 'RESTRICT'})
  @JoinColumn({
    name: 'categoryId',
    foreignKeyConstraintName: 'FKScheduledTransactionsCategoryId',
  })
  category!: CategoryEntity;

  @ManyToOne(() => AccountEntity, {nullable: false, onDelete: 'RESTRICT'})
  @JoinColumn({
    name: 'sourceAccountId',
    foreignKeyConstraintName: 'FKScheduledTransactionsSourceAccountId',
  })
  sourceAccount!: AccountEntity;

  @ManyToOne(() => AccountEntity, {nullable: true, onDelete: 'RESTRICT'})
  @JoinColumn({
    name: 'destinationAccountId',
    foreignKeyConstraintName: 'FKScheduledTransactionsDestinationAccountId',
  })
  destinationAccount!: AccountEntity | null;
}
