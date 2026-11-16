import {Injectable, inject, signal} from '@angular/core';
import {SwUpdate} from '@angular/service-worker';

@Injectable({providedIn: 'root'})
export class UpdateNotificationService {
  private readonly swUpdate = inject(SwUpdate, {optional: true});

  readonly updateAvailable = signal(false);

  constructor() {
    if (!this.swUpdate?.isEnabled) {
      return;
    }
    this.swUpdate.versionUpdates.subscribe((event) => {
      if (event.type === 'VERSION_READY') {
        this.updateAvailable.set(true);
      }
    });
  }

  async reloadToUpdate(): Promise<void> {
    this.updateAvailable.set(false);
    if (!this.swUpdate?.isEnabled) {
      return;
    }
    try {
      await this.swUpdate.activateUpdate();
    } finally {
      document.location.reload();
    }
  }
}
