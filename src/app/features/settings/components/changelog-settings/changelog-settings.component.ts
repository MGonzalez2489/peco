import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {ChangelogStore} from '@core/stores/changelog.store';
import {AppIconComponent} from '@shared/components';

@Component({
  selector: 'app-changelog-settings',
  imports: [AppIconComponent],
  templateUrl: './changelog-settings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangelogSettingsComponent {
  protected readonly changelogStore = inject(ChangelogStore);

  protected readonly loading = this.changelogStore.loading;
  protected readonly error = this.changelogStore.error;
  protected readonly lastChanges = this.changelogStore.lastChanges;

  protected readonly openIndex = signal(0);

  constructor() {
    this.changelogStore.load();
  }

  protected toggle(index: number): void {
    this.openIndex.update((current) => (current === index ? -1 : index));
  }
}
