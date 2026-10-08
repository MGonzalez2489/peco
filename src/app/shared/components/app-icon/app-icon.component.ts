import {ChangeDetectionStrategy, Component, input} from '@angular/core';
import {LucideAngularModule} from 'lucide-angular';

export type IconName =
  | 'search'
  | 'filter'
  | 'calendar'
  | 'arrow-up-right'
  | 'arrow-down-left'
  | 'plus'
  | 'chevron-down'
  | 'pie-chart'
  | 'tag'
  | 'x'
  | 'check'
  | 'trash-2'
  | 'edit'
  | 'sliders-horizontal'
  | 'folder-open'
  | 'dollar-sign'
  | 'credit-card'
  | 'wallet'
  | 'arrow-right'
  | 'trending-up'
  | 'trending-down'
  | 'more-horizontal'
  | 'info'
  | 'settings'
  | 'home'
  | 'list'
  | 'timer'
  | 'user'
  | 'log-in'
  | 'log-out'
  | 'eye'
  | 'eye-off'
  | 'minus'
  | 'upload'
  | 'download'
  | 'save'
  | 'refresh-cw'
  | 'bar-chart-3'
  | 'file-text'
  | 'menu'
  | 'bell'
  | 'help-circle'
  | 'chevron-left'
  | 'chevron-right'
  | 'wrench'
  | 'sun'
  | 'moon'
  | 'monitor'
  | 'square-pen'
  | 'copy'
  | 'landmark'
  | 'banknote'
  | 'zap'
  | 'car'
  | 'baby'
  | 'heart-handshake'
  | 'gift'
  | 'arrow-left-right'
  | 'pencil'
  | 'palette'
  | 'shopping-cart'
  | 'coffee'
  | 'house'
  | 'graduation-cap'
  | 'piggy-bank'
  | 'utensils'
  | 'lock'
  | 'scale'
  | 'pin';

@Component({
  selector: 'app-icon',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './app-icon.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppIconComponent {
  name = input.required<IconName>();
  size = input<number | string>(20);
  strokeWidth = input<number | string>(2);
  class = input<string>('');
}
