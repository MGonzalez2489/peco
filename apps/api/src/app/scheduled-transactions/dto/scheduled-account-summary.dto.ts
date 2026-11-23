import type {ScheduledAccountSummary} from '@peco/contracts';
import {ApiProperty} from '@nestjs/swagger';
import type {AccountEntity} from '../../database/entities';

/** Minimal account identity embedded in schedule responses (8.11). */
export class ScheduledAccountSummaryDto implements ScheduledAccountSummary {
  @ApiProperty({description: 'Identificador público de la cuenta.'})
  readonly publicId: string;

  @ApiProperty({description: 'Nombre de la cuenta.'})
  readonly name: string;

  @ApiProperty({description: 'Tipo de cuenta.'})
  readonly type: ScheduledAccountSummary['type'];

  @ApiProperty({description: 'Color de la cuenta.', nullable: true})
  readonly color: string | null;

  @ApiProperty({description: 'Icono de la cuenta.', nullable: true})
  readonly icon: string | null;

  constructor(account: AccountEntity) {
    this.publicId = account.publicId;
    this.name = account.name;
    this.type = account.type;
    this.color = account.color;
    this.icon = account.icon;
  }
}
