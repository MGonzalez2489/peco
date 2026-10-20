import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {NgOptimizedImage} from '@angular/common';
import {PwaInstallService} from '@core/services/pwa-install.service';
import {UserPreferencesStore} from '@core/stores/user-preferences.store';

@Component({
  selector: 'app-pwa-install-banner',
  imports: [NgOptimizedImage],
  templateUrl: './pwa-install-banner.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PwaInstallBannerComponent {
  private readonly pwaInstallService = inject(PwaInstallService);
  private readonly userPreferencesStore = inject(UserPreferencesStore);

  protected readonly canInstall = this.pwaInstallService.canInstall;
  protected readonly isPwaBannerDismissed = this.userPreferencesStore.isPwaBannerDismissed;

  protected install(): void {
    void this.pwaInstallService.installPwa();
  }

  protected dismiss(): void {
    if (!this.isPwaBannerDismissed()) {
      this.userPreferencesStore.dismissPwaBanner();
    }
    this.pwaInstallService.clearPrompt();
  }
}
