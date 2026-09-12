import {Component, inject, output} from '@angular/core';
import {NavigationEnd, Router, RouterLink, RouterLinkActive} from '@angular/router';
import {filter, map, startWith} from 'rxjs';
import {toSignal} from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
})
export class NavbarComponent {
  readonly capture = output<void>();

  private readonly router = inject(Router);

  readonly links = [
    {label: 'Home', route: '/dashboard', icon: 'home'},
    {label: 'Movements', route: '/movements', icon: 'movements'},
    {label: 'Categories', route: '/categories', icon: 'categories'},
    {label: 'Settings', route: '/preferences', icon: 'settings'},
  ];

  private readonly currentRoute = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.url),
      startWith(this.router.url),
    ),
  );

  isActive(route: string): boolean {
    return this.currentRoute() === route;
  }
}
