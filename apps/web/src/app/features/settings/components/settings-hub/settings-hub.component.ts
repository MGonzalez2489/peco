import {ChangeDetectionStrategy, Component, computed} from '@angular/core';
import {RouterLink} from '@angular/router';
import {SETTINGS_SECTIONS} from '@core/constants/settings-sections.constant';
import {groupSettingsSections} from '@core/utils/group-settings-sections.util';
import {AppIconComponent} from '@shared/components/app-icon/app-icon.component';

@Component({
  selector: 'app-settings-hub',
  imports: [RouterLink, AppIconComponent],
  template: `
    <div class="space-y-6">
      <div class="md:hidden">
        <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Ajustes</h1>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Configura la apariencia, gestiona tus datos y consulta las novedades.
        </p>
      </div>

      <nav aria-label="Secciones de ajustes" class="space-y-6">
        @for (group of groups(); track group.heading) {
          <section>
            @if (group.heading) {
              <h2
                class="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
              >
                {{ group.heading }}
              </h2>
            }
            <ul
              class="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
            >
              @for (section of group.sections; track section.path) {
                <li class="border-t border-slate-200 first:border-t-0 dark:border-slate-800">
                  <a
                    [routerLink]="['/settings', section.path]"
                    class="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 dark:hover:bg-slate-800/60"
                  >
                    <span
                      class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300"
                      aria-hidden="true"
                    >
                      <app-icon [name]="section.icon" size="18" />
                    </span>
                    <span class="min-w-0 flex-1">
                      <span
                        class="block truncate text-sm font-semibold text-slate-900 dark:text-slate-100"
                        >{{ section.title }}</span
                      >
                      <span class="block truncate text-xs text-slate-500 dark:text-slate-400">{{
                        section.description
                      }}</span>
                    </span>
                    <app-icon
                      name="chevron-right"
                      size="18"
                      class="shrink-0 text-slate-400 dark:text-slate-500"
                    />
                  </a>
                </li>
              }
            </ul>
          </section>
        }
      </nav>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsHubComponent {
  protected readonly groups = computed(() => groupSettingsSections(SETTINGS_SECTIONS));
}
