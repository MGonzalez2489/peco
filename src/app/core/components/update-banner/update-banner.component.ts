import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {UpdateNotificationService} from '@core/services/update-notification.service';

@Component({
  selector: 'app-update-banner',
  imports: [],
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
