import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {ThemeService, ThemeMode} from '@core/services/theme.service';

interface ThemeOption {
  mode: ThemeMode;
  label: string;
  description: string;
  iconClasses: string;
}

const THEME_OPTIONS: readonly ThemeOption[] = [
  {
    mode: 'light',
    label: 'Claro',
    description: 'Siempre con fondo claro.',
    iconClasses: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
  },
  {
    mode: 'dark',
    label: 'Oscuro',
    description: 'Siempre con fondo oscuro.',
    iconClasses: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400',
  },
  {
    mode: 'system',
    label: 'Sistema',
    description: 'Sigue la preferencia del dispositivo.',
    iconClasses: 'bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300',
  },
];

@Component({
  selector: 'app-theme-settings',
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
              @if (option.mode === 'light') {
                <svg
                  class="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.8"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
                  />
                </svg>
              } @else if (option.mode === 'dark') {
                <svg
                  class="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.8"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"
                  />
                </svg>
              } @else {
                <svg
                  class="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.8"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25"
                  />
                </svg>
              }
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
