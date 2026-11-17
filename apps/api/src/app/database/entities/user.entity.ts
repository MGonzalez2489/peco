import {Column, Entity, Index} from 'typeorm';
import {UTC_TIMESTAMP_COLUMN} from '../constants/utc-timestamp-column.constant';
import {SoftDeletableEntity} from './soft-deletable.entity';

@Entity('users')
@Index('UQUsersPublicId', ['publicId'], {unique: true})
@Index('IDXUsersLastActiveAt', ['lastActiveAt'])
export class UserEntity extends SoftDeletableEntity {
  @Index('UQUsersEmail', ['email'], {unique: true})
  @Column({type: 'varchar', length: 254})
  email!: string;

  @Column({type: 'varchar', length: 255})
  passwordHash!: string;

  @Column({type: 'varchar', length: 80})
  name!: string;

  /** Written at most once per UTC day by the auth guard (D58). */
  @Column({...UTC_TIMESTAMP_COLUMN, nullable: true})
  lastActiveAt!: string | null;
}
