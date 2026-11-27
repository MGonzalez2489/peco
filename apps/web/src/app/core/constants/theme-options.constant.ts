import {SelectOption} from '../models/select-option.model';
import {AppTheme} from '../types/app-theme.type';
import {AppThemeEnum} from '@peco/enums';

/** Theme options shown in the user preferences selector (UI text in Spanish). */
export const THEME_OPTIONS: readonly SelectOption[] = [
  {value: AppThemeEnum.LIGHT.toString() satisfies AppTheme, label: 'Claro', icon: 'sun'},
  {value: AppThemeEnum.DARK.toString() satisfies AppTheme, label: 'Oscuro', icon: 'moon'},
  {value: AppThemeEnum.SYSTEM.toString() satisfies AppTheme, label: 'Sistema', icon: 'monitor'},
];
