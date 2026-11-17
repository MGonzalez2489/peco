import {Column, Entity, Index, JoinColumn, ManyToOne} from 'typeorm';
import {BIGINT_COLUMN} from '../constants/bigint-column.constant';
import {CreatedEntity} from './created.entity';
import {UserEntity} from './user.entity';

@Entity('auditLogs')
@Index('UQAuditLogsPublicId', ['publicId'], {unique: true})
@Index('IDXAuditLogsUserIdEntityEntityId', ['userId', 'entity', 'entityId'])
@Index('IDXAuditLogsUserIdCreatedAt', ['userId', 'createdAt'])
export class AuditLogEntity extends CreatedEntity {
  @Column({...BIGINT_COLUMN, unsigned: true})
  userId!: number;

  @Column({type: 'varchar', length: 40})
  entity!: string;

  /** The affected row's `publicId`, never the internal numeric id (7.3). */
  @Column({type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin'})
  entityId!: string;

  @Column({type: 'varchar', length: 20})
  action!: string;

  @Column({type: 'json', nullable: true})
  before!: Record<string, unknown> | null;

  @Column({type: 'json', nullable: true})
  after!: Record<string, unknown> | null;

  @ManyToOne(() => UserEntity, {nullable: false, onDelete: 'RESTRICT'})
  @JoinColumn({name: 'userId', foreignKeyConstraintName: 'FKAuditLogsUserId'})
  user!: UserEntity;
}
