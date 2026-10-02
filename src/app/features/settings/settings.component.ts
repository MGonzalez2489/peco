import {ChangeDetectionStrategy, Component} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {SettingsNavComponent} from './components/settings-nav/settings-nav.component';

@Component({
  selector: 'app-settings',
  imports: [RouterOutlet, SettingsNavComponent],
  template: `
    <section class="space-y-6">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Ajustes</h1>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Configura la apariencia, gestiona tus datos y consulta las novedades.
        </p>
      </div>

      <div class="grid grid-cols-1 gap-6 md:grid-cols-[240px_minmax(0,1fr)] md:items-start">
        <aside
          aria-label="Menú de ajustes"
          class="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <app-settings-nav />
        </aside>

        <div
          class="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-6"
        >
          <router-outlet />
        </div>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent {}
