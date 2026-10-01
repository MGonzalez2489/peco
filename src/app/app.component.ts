import {Component, signal} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {PwaInstallBannerComponent} from '@core/components/pwa-install-banner/pwa-install-banner.component';
import {UpdateBannerComponent} from '@core/components/update-banner/update-banner.component';
import {MovementFormModalComponent} from '@features/movements/components';
import {NavbarComponent, SidebarComponent} from '@shared/components';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    NavbarComponent,
    SidebarComponent,
    MovementFormModalComponent,
    PwaInstallBannerComponent,
    UpdateBannerComponent,
  ],
  template: `
    <div
      class="min-h-dvh bg-slate-50 text-slate-900 selection:bg-indigo-500/20 dark:bg-slate-950 dark:text-slate-100"
    >
      <app-sidebar [isOpen]="menuOpen()" (closed)="menuOpen.set(false)" />

      <div class="md:pl-64">
        <app-navbar
          [menuOpen]="menuOpen()"
          (capture)="modalOpen.set(true)"
          (toggleMenu)="menuOpen.update((open) => !open)"
        />

        <main
          id="content"
          tabindex="-1"
          class="mx-auto w-full max-w-5xl px-4 pb-24 pt-6 focus:outline-none md:pb-10 md:pt-6"
        >
          <router-outlet />
        </main>
      </div>
    </div>

    <app-pwa-install-banner />
    <app-update-banner />

    <app-movement-form-modal [isOpen]="modalOpen()" (closed)="modalOpen.set(false)" />
  `,
})
export class AppComponent {
  readonly modalOpen = signal(false);
  readonly menuOpen = signal(false);
}
