import {Component, inject} from '@angular/core';
import {ThemeMode, ThemeService} from '../../core/services/theme.service';

@Component({
  selector: 'app-preferences',
  imports: [],
  templateUrl: './preferences.component.html',
})
export class PreferencesComponent {
  readonly themeService = inject(ThemeService);

  readonly options: Array<{
    mode: ThemeMode;
    label: string;
    description: string;
    iconClasses: string;
  }> = [
    {
      mode: 'light',
      label: 'Light',
      description: 'Always a light background.',
      iconClasses: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
    },
    {
      mode: 'dark',
      label: 'Dark',
      description: 'Always a dark background.',
      iconClasses: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400',
    },
    {
      mode: 'system',
      label: 'System',
      description: 'Follows the device preference.',
      iconClasses: 'bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300',
    },
  ];
}
