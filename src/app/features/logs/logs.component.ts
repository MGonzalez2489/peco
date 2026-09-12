import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {ChangelogService} from '@core/services/changelog.service';

@Component({
  selector: 'app-logs',
  imports: [],
  templateUrl: './logs.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogsComponent {
  readonly changelogService = inject(ChangelogService);

  readonly openIndex = signal(0);

  constructor() {
    this.changelogService.load();
  }

  toggle(index: number): void {
    this.openIndex.update((current) => (current === index ? -1 : index));
  }
}
