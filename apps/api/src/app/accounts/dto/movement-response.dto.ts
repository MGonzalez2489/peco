import type {MovementResponse} from '@peco/contracts';
import {ApiProperty} from '@nestjs/swagger';
import type {AccountEntity, CategoryEntity, MovementEntity} from '../../database/entities';

class MovementAccountSummaryDto {
  @ApiProperty({description: 'Identificador público de la cuenta.'})
  readonly publicId: string;

  @ApiProperty({description: 'Nombre de la cuenta.'})
  readonly name: string;

  @ApiProperty({description: 'Tipo de cuenta.'})
  readonly type: AccountEntity['type'];

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

class MovementCategorySummaryDto {
  @ApiProperty({description: 'Identificador público de la categoría.'})
  readonly publicId: string;

  @ApiProperty({description: 'Nombre normalizado de la categoría.'})
  readonly name: string;

  @ApiProperty({description: 'Nombre visible de la categoría.'})
  readonly displayName: string;

  @ApiProperty({description: 'Color de la categoría.', nullable: true})
  readonly color: string | null;

  @ApiProperty({description: 'Icono de la categoría.', nullable: true})
  readonly icon: string | null;

  @ApiProperty({description: 'Tipos de movimiento aceptados por la categoría.'})
  readonly applyType: CategoryEntity['applyType'];

  constructor(category: CategoryEntity) {
    this.publicId = category.publicId;
    this.name = category.name;
    this.displayName = category.displayName;
    this.color = category.color;
    this.icon = category.icon;
    this.applyType = category.applyType;
  }
}

/** Public ledger entry created by an account-deletion transfer (8.9/US-305). */
export class MovementResponseDto implements MovementResponse {
  @ApiProperty({description: 'Identificador público del movimiento.'})
  readonly publicId: string;

  @ApiProperty({description: 'Tipo de movimiento.'})
  readonly type: MovementEntity['type'];

  @ApiProperty({description: 'Importe positivo en centavos.'})
  readonly amount: number;

  @ApiProperty({description: 'Fecha del movimiento en UTC.'})
  readonly date: string;

  @ApiProperty({description: 'Nota libre del movimiento.', nullable: true})
  readonly note: string | null;

  @ApiProperty({type: () => MovementAccountSummaryDto, description: 'Cuenta de origen.'})
  readonly account: MovementAccountSummaryDto;

  @ApiProperty({
    type: () => MovementAccountSummaryDto,
    description: 'Cuenta de destino.',
    nullable: true,
  })
  readonly targetAccount: MovementAccountSummaryDto | null;

  @ApiProperty({type: () => MovementCategorySummaryDto, description: 'Categoría aplicada.'})
  readonly category: MovementCategorySummaryDto;

  @ApiProperty({description: 'Indica si es el contra de una reversión.'})
  readonly isReversal: boolean;

  @ApiProperty({description: 'Indica si el movimiento fue revertido.'})
  readonly isReversed: boolean;

  @ApiProperty({description: 'Identificador del movimiento invertido.', nullable: true})
  readonly reversalOfPublicId: string | null;

  @ApiProperty({description: 'Identificador del movimiento reemplazado.', nullable: true})
  readonly replacesPublicId: string | null;

  @ApiProperty({description: 'Indica si el movimiento está cancelado.'})
  readonly isCanceled: boolean;

  @ApiProperty({description: 'Identificador de la programación origen.', nullable: true})
  readonly scheduledTransactionPublicId: string | null;

  @ApiProperty({description: 'Versión optimista del movimiento.'})
  readonly version: number;

  @ApiProperty({description: 'Fecha de creación en UTC.'})
  readonly createdAt: string;

  @ApiProperty({description: 'Fecha de última actualización en UTC.'})
  readonly updatedAt: string;

  constructor(
    movement: MovementEntity,
    account: AccountEntity,
    targetAccount: AccountEntity | null,
    category: CategoryEntity,
  ) {
    this.publicId = movement.publicId;
    this.type = movement.type;
    this.amount = movement.amount;
    this.date = movement.date;
    this.note = movement.note;
    this.account = new MovementAccountSummaryDto(account);
    this.targetAccount = targetAccount ? new MovementAccountSummaryDto(targetAccount) : null;
    this.category = new MovementCategorySummaryDto(category);
    this.isReversal = movement.isReversal;
    this.isReversed = movement.isReversed;
    this.reversalOfPublicId = null;
    this.replacesPublicId = null;
    this.isCanceled = movement.isCanceled;
    this.scheduledTransactionPublicId = null;
    this.version = movement.version;
    this.createdAt = movement.createdAt;
    this.updatedAt = movement.updatedAt;
  }
}
