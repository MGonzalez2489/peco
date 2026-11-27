import {MovementType} from '../types/movement-type.type';
import {MovementTypeEnum} from '@peco/enums';

export const resolveDefaultCategoryId = (type: MovementType): string => {
  switch (type) {
    case MovementTypeEnum.INCOME.toString():
      return 'payroll';
    case MovementTypeEnum.EXPENSE.toString():
      return 'services';
    case MovementTypeEnum.TRANSFER.toString():
      return 'transfer';
  }
};
