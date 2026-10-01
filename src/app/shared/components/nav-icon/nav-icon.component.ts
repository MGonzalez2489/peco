import {ChangeDetectionStrategy, Component, input} from '@angular/core';

@Component({
  selector: 'app-nav-icon',
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
