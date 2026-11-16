import {ChangeDetectionStrategy, Component, input} from '@angular/core';
import {AppIconComponent} from '../app-icon/app-icon.component';

@Component({
  selector: 'app-nav-icon',
  imports: [AppIconComponent],
  templateUrl: './nav-icon.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'aria-hidden': 'true',
    class: 'inline-flex shrink-0',
  },
})
export class NavIconComponent {
  readonly name = input.required<string>();
  readonly sizeClass = input('h-5 w-5');
}
