import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {ChangelogStore} from '@core/stores/changelog.store';
import {AppIconComponent} from '@shared/components/app-icon/app-icon.component';

@Component({
  selector: 'app-logs',
  imports: [AppIconComponent],
  templateUrl: './logs.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogsComponent {
  readonly changelogStore = inject(ChangelogStore);

  readonly loading = this.changelogStore.loading;
  readonly error = this.changelogStore.error;
  readonly lastChanges = this.changelogStore.lastChanges;

  readonly openIndex = signal(0);

  constructor() {
    this.changelogStore.load();
  }

  toggle(index: number): void {
    this.openIndex.update((current) => (current === index ? -1 : index));
  }
}
