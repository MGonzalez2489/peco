import {Component, computed, inject, signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {ActivatedRouteSnapshot, NavigationEnd, Router, RouterOutlet} from '@angular/router';
import {filter, map} from 'rxjs';
import {PeriodSnapshotsStore} from '@core/stores/period-snapshots.store';
import {GlobalPeriodStore} from '@core/stores/global-period.store';
import {ApiErrorAlertComponent} from '@core/components/api-error-alert/api-error-alert.component';
import {PwaInstallBannerComponent} from '@core/components/pwa-install-banner/pwa-install-banner.component';
import {UpdateBannerComponent} from '@core/components/update-banner/update-banner.component';
import {MovementFormModalComponent} from '@features/movements/components';
import {NavIconComponent, NavbarComponent, SidebarComponent} from '@shared/components';

const hasPublicData = (snapshot: ActivatedRouteSnapshot): boolean => {
  let current = snapshot;
  while (current.firstChild) current = current.firstChild;
  return current.data['public'] === true;
};

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    NavbarComponent,
    SidebarComponent,
    NavIconComponent,
    MovementFormModalComponent,
    PwaInstallBannerComponent,
    UpdateBannerComponent,
    ApiErrorAlertComponent,
  ],
  template: `
    @if (publicPage()) {
      <router-outlet />
    } @else {
      <div
        class="min-h-dvh bg-slate-50 text-slate-900 selection:bg-indigo-500/20 dark:bg-slate-950 dark:text-slate-100"
      >
        <app-sidebar
          [isOpen]="mobileMenuOpen()"
          [collapsed]="sidebarCollapsed()"
          (closed)="mobileMenuOpen.set(false)"
        />

        <div
          class="transition-[padding] duration-200"
          [class]="sidebarCollapsed() ? 'md:pl-0' : 'md:pl-64'"
        >
          <app-navbar
            [menuOpen]="mobileMenuOpen()"
            [sidebarCollapsed]="sidebarCollapsed()"
            (capture)="modalOpen.set(true)"
            (toggleMenu)="mobileMenuOpen.update((open) => !open)"
            (toggleSidebar)="sidebarCollapsed.update((collapsed) => !collapsed)"
          />

          <main
            id="content"
            tabindex="-1"
            class="mx-auto w-full max-w-5xl px-4 pb-24 pt-6 focus:outline-none md:pb-10 md:pt-6"
          >
            <router-outlet />
          </main>
        </div>

        <button
          type="button"
          (click)="modalOpen.set(true)"
          [disabled]="isPastPeriod()"
          [attr.title]="
            isPastPeriod() ? 'No puedes registrar movimientos en un período cerrado' : null
          "
          class="fixed bottom-6 right-6 z-30 inline-flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-600/40 transition hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-indigo-600 md:hidden dark:focus-visible:ring-offset-slate-950"
          aria-label="Registrar movimiento"
        >
          <app-nav-icon name="plus" sizeClass="h-6 w-6" />
        </button>
      </div>
    }

    <app-api-error-alert />
    <app-pwa-install-banner />
    <app-update-banner />

    <app-movement-form-modal [isOpen]="modalOpen()" (closed)="modalOpen.set(false)" />
  `,
})
export class AppComponent {
  /**
   * Injected eagerly so the store closes every missing past period during app
   * initialization, before the first page reads the period snapshots.
   */
  private readonly periodSnapshotsStore = inject(PeriodSnapshotsStore);
  private readonly globalPeriodStore = inject(GlobalPeriodStore);
  private readonly router = inject(Router);

  private readonly publicNavigation = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => hasPublicData(this.router.routerState.snapshot.root)),
    ),
    {initialValue: false},
  );

  protected readonly publicPage = computed(() => this.publicNavigation());
  readonly isPastPeriod = computed(() => this.globalPeriodStore.isPastPeriod());

  readonly modalOpen = signal(false);
  readonly mobileMenuOpen = signal(false);
  readonly sidebarCollapsed = signal(false);
}
