import {CategoryApplyType} from '@peco/contracts';
import {Column, Entity, Index, JoinColumn, ManyToOne, Unique} from 'typeorm';
import {BIGINT_COLUMN} from '../constants/bigint-column.constant';
import {ENUM_COLUMN} from '../constants/enum-column.constant';
import {numberTransformer} from '../transformers/number.transformer';
import {stringTransformer} from '../transformers/string.transformer';
import {SoftDeletableEntity} from './soft-deletable.entity';
import {UserEntity} from './user.entity';

@Entity('categories')
@Index('UQCategoriesPublicId', ['publicId'], {unique: true})
@Unique('UQCategoriesOwnerActiveName', ['ownerKey', 'activeName'])
export class CategoryEntity extends SoftDeletableEntity {
  /** `NULL` on the global catalog; the owner key keeps it in its own namespace. */
  @Column({...BIGINT_COLUMN, unsigned: true, nullable: true})
  userId!: number | null;

  @Column({type: 'varchar', length: 80})
  name!: string;

  @Column({type: 'varchar', length: 80})
  displayName!: string;

  @Column({type: 'varchar', length: 40, nullable: true})
  icon!: string | null;

  @Column({
    type: 'char',
    length: 7,
    charset: 'ascii',
    collation: 'ascii_bin',
    nullable: true,
  })
  color!: string | null;

  @Column(ENUM_COLUMN)
  applyType!: CategoryApplyType;

  @Column({type: 'boolean', default: false})
  isRoot!: boolean;

  @Column({type: 'boolean', default: false})
  isSystem!: boolean;

  /** `name` while the row is active, `NULL` once soft-deleted (D11). */
  @Column({
    type: 'varchar',
    length: 80,
    transformer: stringTransformer,
    asExpression: 'IF(`deletedAt` IS NULL, `name`, NULL)',
    generatedType: 'VIRTUAL',
    insert: false,
    update: false,
    nullable: true,
  })
  activeName!: string | null;

  /** `COALESCE(userId, 0)`, so the system catalog has its own namespace (D64). */
  @Column({
    type: 'bigint',
    unsigned: true,
    transformer: numberTransformer,
    asExpression: 'COALESCE(`userId`, 0)',
    generatedType: 'STORED',
    insert: false,
    update: false,
  })
  ownerKey!: number;

  @ManyToOne(() => UserEntity, {nullable: true, onDelete: 'RESTRICT'})
  @JoinColumn({name: 'userId', foreignKeyConstraintName: 'FKCategoriesUserId'})
  user!: UserEntity | null;
}
