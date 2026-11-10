import {ChangeDetectionStrategy, Component, inject, input, output} from '@angular/core';
import {RouterLink} from '@angular/router';
import {GlobalPeriodStore} from '@core/stores/global-period.store';
import {GlobalPeriodSelectorComponent} from '../global-period-selector/global-period-selector.component';
import {NavIconComponent} from '../nav-icon/nav-icon.component';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, NavIconComponent, GlobalPeriodSelectorComponent],
  templateUrl: './navbar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent {
  private readonly globalPeriodStore = inject(GlobalPeriodStore);

  readonly menuOpen = input(false);
  readonly sidebarCollapsed = input(false);

  readonly isPastPeriod = this.globalPeriodStore.isPastPeriod;

  readonly capture = output<void>();
  readonly toggleMenu = output<void>();
  readonly toggleSidebar = output<void>();
}
