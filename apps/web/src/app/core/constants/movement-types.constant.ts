import {IconName} from '@shared/components/app-icon/app-icon.component';
import {MovementType} from '../types/movement-type.type';

export const MOVEMENT_TYPES: Array<{
  key: MovementType;
  name: string;
  color: string;
  icon: IconName;
}> = [
  {key: 'INCOME', name: 'Ingreso', color: 'emerald', icon: 'chevron-up'},
  {key: 'EXPENSE', name: 'Egreso', color: 'rose', icon: 'chevron-down'},
  {key: 'TRANSFER', name: 'Transferencia', color: 'sky', icon: 'arrow-left-right'},
];
