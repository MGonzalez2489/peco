import {ChangeDetectionStrategy, Component} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {SettingsNavComponent} from './components/settings-nav/settings-nav.component';

@Component({
  selector: 'app-settings',
  imports: [RouterOutlet, SettingsNavComponent],
  template: `
    <section class="space-y-4 md:space-y-6">
      <div class="hidden md:block">
        <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Ajustes</h1>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Configura la apariencia, gestiona tus datos y consulta las novedades.
        </p>
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-[240px_minmax(0,1fr)] md:items-start md:gap-6">
        <aside
          aria-label="Menú de ajustes"
          class="sticky top-16 z-20 -mx-4 -mt-6 bg-slate-50/95 backdrop-blur md:static md:z-auto md:mx-0 md:mt-0 md:rounded-2xl md:border md:border-slate-200 md:bg-white md:p-3 md:shadow-sm md:dark:bg-slate-900 dark:bg-slate-950/95"
        >
          <app-settings-nav />
        </aside>

        <div
          class="min-w-0 md:rounded-2xl md:border md:border-slate-200 md:bg-white md:p-6 md:shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <router-outlet />
        </div>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent {}
