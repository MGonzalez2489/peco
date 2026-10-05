import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {UpdateNotificationService} from '@core/services/update-notification.service';

import {AppIconComponent} from '@shared/components/app-icon/app-icon.component';

@Component({
  selector: 'app-update-banner',
  imports: [AppIconComponent],
  templateUrl: './update-banner.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpdateBannerComponent {
  private readonly updateNotificationService = inject(UpdateNotificationService);

  protected readonly updateAvailable = this.updateNotificationService.updateAvailable;

  protected reloadToUpdate(): void {
    void this.updateNotificationService.reloadToUpdate();
  }
}
