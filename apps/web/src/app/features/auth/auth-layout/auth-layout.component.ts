import {ChangeDetectionStrategy, Component, input} from '@angular/core';
import {AppIconComponent} from '@shared/components/app-icon/app-icon.component';

/** Chrome-free centered card used by every public authentication page. */
@Component({
  selector: 'app-auth-layout',
  imports: [AppIconComponent],
  templateUrl: './auth-layout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthLayoutComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
}
