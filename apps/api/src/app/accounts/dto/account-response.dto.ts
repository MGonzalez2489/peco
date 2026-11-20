import type {AccountResponse} from '@peco/contracts';
import {ApiProperty} from '@nestjs/swagger';
import type {AccountEntity} from '../../database/entities';

/** Public account shape; internal ids and `initialBalance` never leave the API (D9/8.8). */
export class AccountResponseDto implements AccountResponse {
  @ApiProperty({description: 'Identificador público de la cuenta.'})
  readonly publicId: string;

  @ApiProperty({description: 'Nombre de la cuenta.'})
  readonly name: string;

  @ApiProperty({description: 'Tipo de cuenta.'})
  readonly type: AccountResponse['type'];

  @ApiProperty({description: 'Saldo actual en centavos.'})
  readonly currentBalance: number;

  @ApiProperty({description: 'Indica si la cuenta entra en los totales disponibles.'})
  readonly includeInTotal: boolean;

  @ApiProperty({description: 'Meta de ahorro en centavos.', nullable: true})
  readonly targetGoal: number | null;

  @ApiProperty({description: 'Límite de crédito en centavos.', nullable: true})
  readonly creditLimit: number | null;

  @ApiProperty({description: 'Color de la cuenta.', nullable: true})
  readonly color: string | null;

  @ApiProperty({description: 'Icono de la cuenta.', nullable: true})
  readonly icon: string | null;

  @ApiProperty({description: 'Indica si la cuenta está fijada en el inicio.'})
  readonly pinToHome: boolean;

  @ApiProperty({description: 'Indica si la cuenta es la cuenta raíz.'})
  readonly isRoot: boolean;

  @ApiProperty({description: 'Nota libre de la cuenta.', nullable: true})
  readonly note: string | null;

  @ApiProperty({description: 'Versión optimista de la cuenta.'})
  readonly version: number;

  @ApiProperty({description: 'Fecha de creación en UTC.'})
  readonly createdAt: string;

  @ApiProperty({description: 'Fecha de última actualización en UTC.'})
  readonly updatedAt: string;

  constructor(account: AccountEntity) {
    this.publicId = account.publicId;
    this.name = account.name;
    this.type = account.type;
    this.currentBalance = account.currentBalance;
    this.includeInTotal = account.includeInTotal;
    this.targetGoal = account.targetGoal;
    this.creditLimit = account.creditLimit;
    this.color = account.color;
    this.icon = account.icon;
    this.pinToHome = account.pinToHome;
    this.isRoot = account.isRoot;
    this.note = account.note;
    this.version = account.version;
    this.createdAt = account.createdAt;
    this.updatedAt = account.updatedAt;
  }
}
