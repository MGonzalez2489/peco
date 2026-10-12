import {ChangeDetectionStrategy, Component, computed, input} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {
  ControlValueAccessor,
  FormControl,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
} from '@angular/forms';
import {SelectOption} from '@core/models';
import {CategoryColorOption} from '@core/types';
import {AppSelectComponent} from '../app-select/app-select.component';

@Component({
  selector: 'app-color-select',
  imports: [AppSelectComponent, ReactiveFormsModule],
  templateUrl: './color-select.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{provide: NG_VALUE_ACCESSOR, useExisting: ColorSelectComponent, multi: true}],
  host: {class: 'block'},
})
export class ColorSelectComponent implements ControlValueAccessor {
  readonly palette = input<readonly CategoryColorOption[]>([]);
  readonly ariaLabel = input('Color');
  readonly placeholder = input('Selecciona un color');
  readonly controlId = input('');

  protected readonly control = new FormControl<string>('', {nonNullable: true});

  protected readonly options = computed<SelectOption[]>(() =>
    this.palette().map((option) => ({value: option.hex, label: option.label, color: option.hex})),
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
