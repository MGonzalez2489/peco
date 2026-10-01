import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {NavigationEnd, Router, RouterLink} from '@angular/router';
import {filter, map, startWith} from 'rxjs';
import {NAVIGATION_ITEMS} from '@core/constants';
import {NavIconComponent} from '../nav-icon/nav-icon.component';

const DESKTOP_MEDIA_QUERY = '(min-width: 768px)';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, NavIconComponent],
  templateUrl: './sidebar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'close()',
  },
})
export class SidebarComponent {
  readonly isOpen = input(false);

  readonly closed = output<void>();

  private readonly router = inject(Router);

  protected readonly items = signal(NAVIGATION_ITEMS);

  private readonly desktopMedia = window.matchMedia?.(DESKTOP_MEDIA_QUERY) ?? null;

  protected readonly isDesktop = signal(this.desktopMedia?.matches ?? false);

  protected readonly drawerVisible = computed(() => !this.isDesktop() && this.isOpen());

  protected readonly drawerHidden = computed(() => !this.isDesktop() && !this.isOpen());

  protected readonly asideClasses = computed(() =>
    this.drawerVisible() ? 'translate-x-0' : '-translate-x-full',
  );

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

  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    const media = this.desktopMedia;
    if (media) {
      const onChange = (event: MediaQueryListEvent): void => this.isDesktop.set(event.matches);

      media.addEventListener('change', onChange);
      this.destroyRef.onDestroy(() => media.removeEventListener('change', onChange));
    }

    effect(() => {
      document.body.classList.toggle('overflow-hidden', this.drawerVisible());
    });
  }

  protected isItemActive(route: string): boolean {
    return this.currentPath() === route;
  }

  protected linkClasses(route: string): string {
    if (this.isItemActive(route)) {
      return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300';
    }

    return 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800';
  }

  protected close(): void {
    if (this.isOpen() && !this.isDesktop()) {
      this.closed.emit();
    }
  }
}
