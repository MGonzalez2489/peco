import {ChangeDetectionStrategy, Component, computed} from '@angular/core';
import {RouterLink, RouterLinkActive} from '@angular/router';
import {SETTINGS_SECTIONS} from '@core/constants/settings-sections.constant';
import {groupSettingsSections} from '@core/utils/group-settings-sections.util';
import {AppIconComponent} from '@shared/components/app-icon/app-icon.component';

@Component({
  selector: 'app-settings-nav',
  imports: [RouterLink, RouterLinkActive, AppIconComponent],
  template: `
    <nav aria-label="Categorías de ajustes" class="space-y-5">
      @for (group of groups(); track group.heading) {
        <div>
          @if (group.heading) {
            <h2
              class="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
            >
              {{ group.heading }}
            </h2>
          }
          <ul class="space-y-1">
            @for (section of group.sections; track section.path) {
              <li>
                <a
                  [routerLink]="['/settings', section.path]"
                  routerLinkActive="bg-indigo-50 text-indigo-700! dark:bg-indigo-500/15 dark:text-indigo-300"
                  [routerLinkActiveOptions]="{exact: true}"
                  class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:text-slate-300 dark:hover:bg-slate-800 dark:focus-visible:ring-offset-slate-950"
                >
                  <app-icon [name]="section.icon" size="18" class="h-5 w-5 shrink-0 opacity-70" />
                  <span class="min-w-0">
                    <span class="block truncate">{{ section.title }}</span>
                    <span class="block truncate text-xs font-normal opacity-70">{{
                      section.description
                    }}</span>
                  </span>
                </a>
              </li>
            }
          </ul>
        </div>
      }
    </nav>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsNavComponent {
  protected readonly groups = computed(() => groupSettingsSections(SETTINGS_SECTIONS));
}
