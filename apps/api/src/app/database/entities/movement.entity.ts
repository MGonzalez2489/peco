import {MovementType} from '@peco/contracts';
import {Column, Entity, Index, JoinColumn, ManyToOne} from 'typeorm';
import {BIGINT_COLUMN} from '../constants/bigint-column.constant';
import {ENUM_COLUMN} from '../constants/enum-column.constant';
import {UTC_TIMESTAMP_COLUMN} from '../constants/utc-timestamp-column.constant';
import {SoftDeletableEntity} from './soft-deletable.entity';
import {AccountEntity} from './account.entity';
import {CategoryEntity} from './category.entity';
import {ScheduledTransactionEntity} from './scheduled-transaction.entity';
import {UserEntity} from './user.entity';

@Entity('movements')
@Index('UQMovementsPublicId', ['publicId'], {unique: true})
@Index('IDXMovementsUserIdDate', ['userId', 'date'])
@Index('IDXMovementsUserIdAccountIdDate', ['userId', 'accountId', 'date'])
@Index('IDXMovementsUserIdTargetAccountIdDate', ['userId', 'targetAccountId', 'date'])
@Index('IDXMovementsScheduledTransactionId', ['scheduledTransactionId'])
export class MovementEntity extends SoftDeletableEntity {
  @Column({...BIGINT_COLUMN, unsigned: true})
  userId!: number;

  @Column({...BIGINT_COLUMN, unsigned: true})
  accountId!: number;

  @Column({...BIGINT_COLUMN, unsigned: true, nullable: true})
  targetAccountId!: number | null;

  @Column({...BIGINT_COLUMN, unsigned: true})
  categoryId!: number;

  @Column(ENUM_COLUMN)
  type!: MovementType;

  @Column(BIGINT_COLUMN)
  amount!: number;

  @Column(UTC_TIMESTAMP_COLUMN)
  date!: string;

  @Column({type: 'varchar', length: 500, nullable: true})
  note!: string | null;

  @Column({...BIGINT_COLUMN, unsigned: true, nullable: true})
  reversalId!: number | null;

  @Column({...BIGINT_COLUMN, unsigned: true, nullable: true})
  replacesMovementId!: number | null;

  @Column({type: 'boolean', default: false})
  isReversal!: boolean;

  @Column({type: 'boolean', default: false})
  isReversed!: boolean;

  @Column({type: 'boolean', default: false})
  isCanceled!: boolean;

  @Column({...BIGINT_COLUMN, unsigned: true, nullable: true})
  scheduledTransactionId!: number | null;

  @Column({type: 'int', unsigned: true, default: 0})
  version!: number;

  @ManyToOne(() => UserEntity, {nullable: false, onDelete: 'RESTRICT'})
  @JoinColumn({name: 'userId', foreignKeyConstraintName: 'FKMovementsUserId'})
  user!: UserEntity;

  @ManyToOne(() => AccountEntity, {nullable: false, onDelete: 'RESTRICT'})
  @JoinColumn({name: 'accountId', foreignKeyConstraintName: 'FKMovementsAccountId'})
  account!: AccountEntity;

  @ManyToOne(() => AccountEntity, {nullable: true, onDelete: 'RESTRICT'})
  @JoinColumn({name: 'targetAccountId', foreignKeyConstraintName: 'FKMovementsTargetAccountId'})
  targetAccount!: AccountEntity | null;

  @ManyToOne(() => CategoryEntity, {nullable: false, onDelete: 'RESTRICT'})
  @JoinColumn({name: 'categoryId', foreignKeyConstraintName: 'FKMovementsCategoryId'})
  category!: CategoryEntity;

  @ManyToOne(() => MovementEntity, {nullable: true, onDelete: 'SET NULL'})
  @JoinColumn({name: 'reversalId', foreignKeyConstraintName: 'FKMovementsReversalId'})
  reversalOf!: MovementEntity | null;

  @ManyToOne(() => MovementEntity, {nullable: true, onDelete: 'SET NULL'})
  @JoinColumn({
    name: 'replacesMovementId',
    foreignKeyConstraintName: 'FKMovementsReplacesMovementId',
  })
  replacesMovement!: MovementEntity | null;

  @ManyToOne(() => ScheduledTransactionEntity, {nullable: true, onDelete: 'SET NULL'})
  @JoinColumn({
    name: 'scheduledTransactionId',
    foreignKeyConstraintName: 'FKMovementsScheduledTransactionId',
  })
  scheduledTransaction!: ScheduledTransactionEntity | null;
}
