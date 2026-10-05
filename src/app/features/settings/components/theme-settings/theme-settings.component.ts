import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {ThemeService, ThemeMode} from '@core/services/theme.service';
import {AppIconComponent, IconName} from '@shared/components';

interface ThemeOption {
  mode: ThemeMode;
  label: string;
  description: string;
  icon: IconName;
  iconClasses: string;
}

const THEME_OPTIONS: readonly ThemeOption[] = [
  {
    mode: 'light',
    label: 'Claro',
    description: 'Siempre con fondo claro.',
    icon: 'sun',
    iconClasses: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
  },
  {
    mode: 'dark',
    label: 'Oscuro',
    description: 'Siempre con fondo oscuro.',
    icon: 'moon',
    iconClasses: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400',
  },
  {
    mode: 'system',
    label: 'Sistema',
    description: 'Sigue la preferencia del dispositivo.',
    icon: 'monitor',
    iconClasses: 'bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300',
  },
];

@Component({
  selector: 'app-theme-settings',
  imports: [AppIconComponent],
  template: `
    <section aria-labelledby="theme-settings-title" class="space-y-4">
      <div>
        <h2
          id="theme-settings-title"
          class="text-lg font-bold tracking-tight text-slate-900 dark:text-white"
        >
          Apariencia
        </h2>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Elige cómo se ve la aplicación en este dispositivo.
        </p>
      </div>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Tema">
        @for (option of options; track option.mode) {
          <button
            type="button"
            role="radio"
            (click)="themeService.setThemeMode(option.mode)"
            class="flex flex-col items-start gap-3 rounded-2xl border-2 bg-white p-4 text-left shadow-sm transition hover:border-indigo-400 dark:bg-slate-900"
            [class]="
              themeService.themeMode() === option.mode
                ? 'border-indigo-500 ring-2 ring-indigo-500/20'
                : 'border-slate-200 dark:border-slate-800'
            "
            [attr.aria-checked]="themeService.themeMode() === option.mode"
          >
            <span
              class="flex h-10 w-10 items-center justify-center rounded-xl {{ option.iconClasses }}"
              aria-hidden="true"
            >
              <app-icon
                [name]="option.icon"
                size="20"
                strokeWidth="1.8"
                class="h-5 w-5"
              />
            </span>
            <span class="text-sm font-semibold text-slate-900 dark:text-white">{{
              option.label
            }}</span>
            <span class="text-xs leading-relaxed text-slate-500 dark:text-slate-400">{{
              option.description
            }}</span>
          </button>
        }
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeSettingsComponent {
  protected readonly themeService = inject(ThemeService);
  protected readonly options = THEME_OPTIONS;
}
