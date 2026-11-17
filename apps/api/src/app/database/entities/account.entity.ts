import {AccountType} from '@peco/contracts';
import {Column, Entity, Index, JoinColumn, ManyToOne, Unique} from 'typeorm';
import {BIGINT_COLUMN} from '../constants/bigint-column.constant';
import {ENUM_COLUMN} from '../constants/enum-column.constant';
import {numberTransformer} from '../transformers/number.transformer';
import {SoftDeletableEntity} from './soft-deletable.entity';
import {UserEntity} from './user.entity';

@Entity('accounts')
@Index('UQAccountsPublicId', ['publicId'], {unique: true})
@Index('IDXAccountsUserIdDeletedAt', ['userId', 'deletedAt'])
@Unique('UQAccountsRootKey', ['rootKey'])
export class AccountEntity extends SoftDeletableEntity {
  @Column({...BIGINT_COLUMN, unsigned: true})
  userId!: number;

  @Column({type: 'varchar', length: 80})
  name!: string;

  @Column(ENUM_COLUMN)
  type!: AccountType;

  @Column({...BIGINT_COLUMN, default: 0})
  initialBalance!: number;

  @Column({...BIGINT_COLUMN, default: 0})
  currentBalance!: number;

  @Column({type: 'boolean', default: true})
  includeInTotal!: boolean;

  @Column({...BIGINT_COLUMN, nullable: true})
  targetGoal!: number | null;

  @Column({...BIGINT_COLUMN, nullable: true})
  creditLimit!: number | null;

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

  @Column({type: 'boolean', default: false})
  pinToHome!: boolean;

  @Column({type: 'boolean', default: false})
  isRoot!: boolean;

  @Column({type: 'varchar', length: 500, nullable: true})
  note!: string | null;

  @Column({type: 'int', unsigned: true, default: 0})
  version!: number;

  /**
   * One root account per user: `userId` when the row is the active root, `NULL`
   * otherwise. MySQL ignores `NULL` in the unique index (7.4).
   */
  @Column({
    type: 'bigint',
    unsigned: true,
    transformer: numberTransformer,
    asExpression: 'IF((`isRoot` = 1) AND (`deletedAt` IS NULL), `userId`, NULL)',
    generatedType: 'VIRTUAL',
    insert: false,
    update: false,
    nullable: true,
  })
  rootKey!: number | null;

  @ManyToOne(() => UserEntity, {nullable: false, onDelete: 'RESTRICT'})
  @JoinColumn({name: 'userId', foreignKeyConstraintName: 'FKAccountsUserId'})
  user!: UserEntity;
}
