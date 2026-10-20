import {ChangeDetectionStrategy, Component, input, output} from '@angular/core';

@Component({
  selector: 'app-setting-toggle-row',
  templateUrl: './setting-toggle-row.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingToggleRowComponent {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly checked = input(false);
  readonly disabled = input(false);

  readonly checkedChange = output<boolean>();

  onCheckboxChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.checkedChange.emit(target.checked);
  }
}
