import {IconName} from '@shared/components/app-icon/app-icon.component';
import {MovementType} from '../types/movement-type.type';
import {MovementTypeEnum} from '@peco/enums';

export const MOVEMENT_TYPES: Array<{
  key: MovementType;
  name: string;
  color: string;
  icon: IconName;
}> = [
  {key: MovementTypeEnum.INCOME.toString(), name: 'Ingreso', color: 'emerald', icon: 'chevron-up'},
  {key: MovementTypeEnum.EXPENSE.toString(), name: 'Egreso', color: 'rose', icon: 'chevron-down'},
  {
    key: MovementTypeEnum.TRANSFER.toString(),
    name: 'Transferencia',
    color: 'sky',
    icon: 'arrow-left-right',
  },
];
