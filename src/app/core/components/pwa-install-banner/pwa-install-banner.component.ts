import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {PwaInstallService} from '@core/services/pwa-install.service';

@Component({
  selector: 'app-pwa-install-banner',
  imports: [],
  templateUrl: './pwa-install-banner.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PwaInstallBannerComponent {
  private readonly pwaInstallService = inject(PwaInstallService);

  protected readonly canInstall = this.pwaInstallService.canInstall;

  protected install(): void {
    void this.pwaInstallService.installPwa();
  }

  protected dismiss(): void {
    this.pwaInstallService.dismiss();
  }
}
