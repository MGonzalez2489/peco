import {MovementType} from '../types/movement-type.type';

export const resolveDefaultCategoryId = (type: MovementType): string => {
  switch (type) {
    case 'INCOME':
      return 'payroll';
    case 'EXPENSE':
      return 'services';
    case 'TRANSFER':
      return 'transfer';
  }
};
