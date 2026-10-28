import {AccountTypeDefinition} from '../models/account-type-definition.model';
import {SelectOption} from '../models/select-option.model';
import {accountColor} from './account-color.util';

export const toAccountTypeOption = (definition: AccountTypeDefinition): SelectOption => ({
  value: definition.key,
  label: definition.name,
  icon: definition.icon,
  color: accountColor(definition.color).chip,
});
