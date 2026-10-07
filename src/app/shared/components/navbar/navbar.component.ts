import {ChangeDetectionStrategy, Component, input, output} from '@angular/core';
import {RouterLink} from '@angular/router';
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
}
