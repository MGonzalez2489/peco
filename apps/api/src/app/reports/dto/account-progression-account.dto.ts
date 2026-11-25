import type {AccountProgressionAccount} from '@peco/contracts';
import {ApiProperty} from '@nestjs/swagger';

/** Public account identity included in a progression response (8.13). */
export class AccountProgressionAccountDto implements AccountProgressionAccount {
  @ApiProperty({description: 'Identificador público de la cuenta.'})
  readonly publicId!: string;

  @ApiProperty({description: 'Nombre de la cuenta.'})
  readonly name!: string;

  @ApiProperty({description: 'Tipo de cuenta.'})
  readonly type!: AccountProgressionAccount['type'];

  @ApiProperty({description: 'Color de la cuenta.', nullable: true})
  readonly color!: string | null;

  @ApiProperty({description: 'Icono de la cuenta.', nullable: true})
  readonly icon!: string | null;
}
