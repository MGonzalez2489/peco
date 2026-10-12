import {ChangeDetectionStrategy, Component, computed, input} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {
  ControlValueAccessor,
  FormControl,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
} from '@angular/forms';
import {SelectOption} from '@core/models';
import {CategoryIconOption} from '@core/types';
import {AppSelectComponent} from '../app-select/app-select.component';

@Component({
  selector: 'app-icon-select',
  imports: [AppSelectComponent, ReactiveFormsModule],
  templateUrl: './icon-select.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{provide: NG_VALUE_ACCESSOR, useExisting: IconSelectComponent, multi: true}],
  host: {class: 'block'},
})
export class IconSelectComponent implements ControlValueAccessor {
  readonly icons = input<readonly CategoryIconOption[]>([]);
  readonly ariaLabel = input('Ícono');
  readonly placeholder = input('Selecciona un ícono');
  readonly controlId = input('');

  protected readonly control = new FormControl<string>('', {nonNullable: true});

  protected readonly options = computed<SelectOption[]>(() =>
    this.icons().map((option) => ({value: option.name, label: option.label, icon: option.name})),
  );

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  constructor() {
    this.control.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      this.onChange(value);
      this.onTouched();
    });
  }

  writeValue(value: string | null): void {
    this.control.setValue(value ?? '', {emitEvent: false});
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    if (isDisabled) {
      this.control.disable({emitEvent: false});
    } else {
      this.control.enable({emitEvent: false});
    }
  }
}
