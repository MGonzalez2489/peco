import {Location} from '@angular/common';
import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {NavigationEnd, Router, RouterOutlet} from '@angular/router';
import {filter} from 'rxjs';
import {SETTINGS_SECTIONS} from '@core/constants/settings-sections.constant';
import {AppIconComponent} from '@shared/components/app-icon/app-icon.component';
import {SettingsNavComponent} from './components/settings-nav/settings-nav.component';

@Component({
  selector: 'app-settings',
  imports: [AppIconComponent, RouterOutlet, SettingsNavComponent],
  template: `
    <section class="space-y-4 md:space-y-6">
      <div class="hidden md:block">
        <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Ajustes</h1>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Configura la apariencia, gestiona tus datos y consulta las novedades.
        </p>
      </div>

      <div
        class="grid grid-cols-1 gap-4 md:grid-cols-[240px_minmax(0,1fr)] md:items-start md:gap-6"
      >
        <aside
          aria-label="Menú de ajustes"
          class="hidden md:block md:rounded-2xl md:border md:border-slate-200 md:bg-white md:p-3 md:shadow-sm md:dark:bg-slate-900"
        >
          <app-settings-nav />
        </aside>

        <div
          class="min-w-0 md:rounded-2xl md:border md:border-slate-200 md:bg-white md:p-6 md:shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          @if (currentSection(); as section) {
            <div class="flex items-center gap-3 md:hidden">
              <button
                type="button"
                (click)="goBack()"
                aria-label="Volver a Ajustes"
                class="flex shrink-0 items-center justify-center rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:text-slate-300 dark:hover:bg-slate-800 dark:focus-visible:ring-offset-slate-950"
              >
                <app-icon name="chevron-left" size="20" />
              </button>
              <h2 class="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                {{ section.title }}
              </h2>
            </div>
          }
          <router-outlet />
        </div>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent {
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly currentUrl = signal(this.router.url);

  protected readonly currentSection = computed(() => {
    const path = this.currentUrl().split(/[?#]/)[0].replace(/\/+$/, '');
    const sectionPath = path.startsWith('/settings/') ? path.slice('/settings/'.length) : '';
    return SETTINGS_SECTIONS.find((section) => section.path === sectionPath);
  });

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => this.currentUrl.set(event.urlAfterRedirects));
  }

  protected goBack(): void {
    const state = globalThis.history?.state as {navigationId?: number} | null;

    if (state?.navigationId !== undefined && state.navigationId > 1) {
      this.location.back();
      return;
    }

    void this.router.navigate(['/settings']);
  }
}
