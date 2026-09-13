import {ChangeDetectionStrategy, Component, effect, inject, output, signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {NavigationEnd, Router, RouterLink} from '@angular/router';
import {filter, map, startWith} from 'rxjs';

type MenuItem = {
  label: string;
  route: string;
  icon: string;
  isActive: boolean;
};

@Component({
  selector: 'app-navbar',
  imports: [RouterLink],
  templateUrl: './navbar.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent {
  readonly capture = output<void>();

  private readonly router = inject(Router);

  protected readonly items = signal<MenuItem[]>([
    {label: 'Inicio', route: '/dashboard', icon: 'home', isActive: false},
    {label: 'Movimientos', route: '/movements', icon: 'movements', isActive: false},
    {label: 'Categorías', route: '/categories', icon: 'categories', isActive: false},
    {label: 'Ajustes', route: '/preferences', icon: 'settings', isActive: false},
    {label: 'Cambios', route: '/logs', icon: 'logs', isActive: false},
  ]);

  private readonly currentRoute = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.url),
      startWith(this.router.url),
    ),
  );

  constructor() {
    effect(() => {
      const cCurrentRoute = this.currentRoute();
      if (!cCurrentRoute) return;

      this.items.update((items) =>
        items.map((item) =>
          item.route.includes(cCurrentRoute)
            ? {...item, isActive: true}
            : {...item, isActive: false},
        ),
      );
    });
  }
}
