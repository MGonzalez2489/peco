import {SelectOption} from '../models/select-option.model';
import {AppTheme} from '../types/app-theme.type';

/** Theme options shown in the user preferences selector (UI text in Spanish). */
export const THEME_OPTIONS: readonly SelectOption[] = [
  {value: 'light' satisfies AppTheme, label: 'Claro', icon: 'sun'},
  {value: 'dark' satisfies AppTheme, label: 'Oscuro', icon: 'moon'},
  {value: 'system' satisfies AppTheme, label: 'Sistema', icon: 'monitor'},
];
