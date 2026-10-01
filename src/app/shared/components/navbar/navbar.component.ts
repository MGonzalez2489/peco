import {ChangeDetectionStrategy, Component, computed, inject, input, output} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {NavigationEnd, Router, RouterLink} from '@angular/router';
import {filter, map, startWith} from 'rxjs';
import {NAVIGATION_QUICK_LINKS} from '@core/constants';
import {NavIconComponent} from '../nav-icon/nav-icon.component';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, NavIconComponent],
  templateUrl: './navbar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent {
  readonly menuOpen = input(false);
  readonly sidebarCollapsed = input(false);

  readonly capture = output<void>();
  readonly toggleMenu = output<void>();
  readonly toggleSidebar = output<void>();

  private readonly router = inject(Router);

  protected readonly quickLinks = NAVIGATION_QUICK_LINKS;

  private readonly currentRoute = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.url),
      startWith(this.router.url),
    ),
  );

  protected readonly currentPath = computed(() => {
    const url = (this.currentRoute() ?? '').split('?')[0].split('#')[0];
    const segments = url.split('/').filter(Boolean);

    return `/${segments[0] ?? ''}`;
  });

  protected isItemActive(route: string): boolean {
    return this.currentPath() === route;
  }

  protected linkClasses(route: string): string {
    if (this.isItemActive(route)) {
      return 'text-indigo-600 dark:text-indigo-400';
    }

    return 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white';
  }
}
