import type {ScheduledTransactionResponse} from '@peco/contracts';
import {ApiProperty} from '@nestjs/swagger';
import type {
  AccountEntity,
  CategoryEntity,
  ScheduledTransactionEntity,
} from '../../database/entities';
import {ScheduledAccountSummaryDto} from './scheduled-account-summary.dto';
import {ScheduledCategorySummaryDto} from './scheduled-category-summary.dto';

/** Public schedule shape; internal ids and relations never leave the API (8.11). */
export class ScheduledTransactionResponseDto implements ScheduledTransactionResponse {
  @ApiProperty({description: 'Identificador público del programa.'})
  readonly publicId: string;

  @ApiProperty({description: 'Nombre del programa.'})
  readonly name: string;

  @ApiProperty({description: 'Importe estimado en centavos.'})
  readonly estimatedAmount: number;

  @ApiProperty({description: 'Tipo de movimiento que generará.'})
  readonly type: ScheduledTransactionResponse['type'];

  @ApiProperty({type: ScheduledCategorySummaryDto})
  readonly category: ScheduledCategorySummaryDto;

  @ApiProperty({type: ScheduledAccountSummaryDto})
  readonly sourceAccount: ScheduledAccountSummaryDto;

  @ApiProperty({type: ScheduledAccountSummaryDto, nullable: true})
  readonly destinationAccount: ScheduledAccountSummaryDto | null;

  @ApiProperty({description: 'Frecuencia de la malla.'})
  readonly frequency: ScheduledTransactionResponse['frequency'];

  @ApiProperty({description: 'Número de períodos entre ocurrencias.'})
  readonly interval: number;

  @ApiProperty({description: 'Primera fecha contemplada elegida por el usuario.'})
  readonly anchorDate: string;

  @ApiProperty({description: 'Siguiente fecha contemplada de la malla.'})
  readonly nextContemplatedDate: string;

  @ApiProperty({description: 'Siguiente fecha aplicada, posterior a la laborable.'})
  readonly nextExecutionDate: string;

  @ApiProperty({description: 'Indica si el programa se aplica automáticamente.'})
  readonly autoApply: boolean;

  @ApiProperty({description: 'Indica si el programa está activo.'})
  readonly active: boolean;

  @ApiProperty({description: 'Límite de ocurrencias procesadas.', nullable: true})
  readonly totalOccurrences: number | null;

  @ApiProperty({description: 'Ocurrencias procesadas hasta la fecha.'})
  readonly completedOccurrences: number;

  @ApiProperty({description: 'Última fecha contemplada permitida.', nullable: true})
  readonly endDate: string | null;

  @ApiProperty({description: 'Versión optimista del programa.'})
  readonly version: number;

  @ApiProperty({description: 'Fecha de creación en UTC.'})
  readonly createdAt: string;

  @ApiProperty({description: 'Fecha de última actualización en UTC.'})
  readonly updatedAt: string;

  constructor(
    schedule: ScheduledTransactionEntity,
    related: {
      category: CategoryEntity;
      sourceAccount: AccountEntity;
      destinationAccount: AccountEntity | null;
    },
  ) {
    this.publicId = schedule.publicId;
    this.name = schedule.name;
    this.estimatedAmount = schedule.estimatedAmount;
    this.type = schedule.type;
    this.category = new ScheduledCategorySummaryDto(related.category);
    this.sourceAccount = new ScheduledAccountSummaryDto(related.sourceAccount);
    this.destinationAccount = related.destinationAccount
      ? new ScheduledAccountSummaryDto(related.destinationAccount)
      : null;
    this.frequency = schedule.frequency;
    this.interval = schedule.interval;
    this.anchorDate = schedule.anchorDate;
    this.nextContemplatedDate = schedule.nextContemplatedDate;
    this.nextExecutionDate = schedule.nextExecutionDate;
    this.autoApply = schedule.autoApply;
    this.active = schedule.active;
    this.totalOccurrences = schedule.totalOccurrences;
    this.completedOccurrences = schedule.completedOccurrences;
    this.endDate = schedule.endDate;
    this.version = schedule.version;
    this.createdAt = schedule.createdAt;
    this.updatedAt = schedule.updatedAt;
  }
}
