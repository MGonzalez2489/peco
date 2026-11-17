import {ScheduledExecutionStatus} from '@peco/contracts';
import {Column, Entity, Index, JoinColumn, ManyToOne, Unique} from 'typeorm';
import {BIGINT_COLUMN} from '../constants/bigint-column.constant';
import {ENUM_COLUMN} from '../constants/enum-column.constant';
import {CreatedEntity} from './created.entity';
import {MovementEntity} from './movement.entity';
import {ScheduledTransactionEntity} from './scheduled-transaction.entity';

@Entity('scheduledExecutions')
@Index('UQScheduledExecutionsPublicId', ['publicId'], {unique: true})
@Unique('UQScheduledExecutionsScheduledTransactionIdContemplatedDate', [
  'scheduledTransactionId',
  'contemplatedDate',
])
@Index('IDXScheduledExecutionsScheduledTransactionIdOccurrenceDate', [
  'scheduledTransactionId',
  'occurrenceDate',
])
export class ScheduledExecutionEntity extends CreatedEntity {
  @Column({...BIGINT_COLUMN, unsigned: true})
  scheduledTransactionId!: number;

  @Column({type: 'date'})
  contemplatedDate!: string;

  @Column({type: 'date', nullable: true})
  occurrenceDate!: string | null;

  @Column({...BIGINT_COLUMN, unsigned: true, nullable: true})
  movementId!: number | null;

  @Column(ENUM_COLUMN)
  status!: ScheduledExecutionStatus;

  @Column({type: 'varchar', length: 40, nullable: true})
  reason!: string | null;

  @Column({type: 'int', unsigned: true, default: 0})
  attempts!: number;

  @ManyToOne(() => ScheduledTransactionEntity, {nullable: false, onDelete: 'CASCADE'})
  @JoinColumn({
    name: 'scheduledTransactionId',
    foreignKeyConstraintName: 'FKScheduledExecutionsScheduledTransactionId',
  })
  scheduledTransaction!: ScheduledTransactionEntity;

  @ManyToOne(() => MovementEntity, {nullable: true, onDelete: 'SET NULL'})
  @JoinColumn({
    name: 'movementId',
    foreignKeyConstraintName: 'FKScheduledExecutionsMovementId',
  })
  movement!: MovementEntity | null;
}
