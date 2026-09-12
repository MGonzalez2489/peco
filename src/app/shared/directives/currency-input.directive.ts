import {Directive, ElementRef, inject, input} from '@angular/core';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from '@angular/forms';

const fixedFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function onlyNumeric(raw: string): string {
  return raw.replace(/[^\d.]/g, '');
}

function parseCurrency(raw: string): number | null {
  const cleaned = onlyNumeric(raw);
  if (!cleaned || cleaned === '.') return null;
  const [integer = '0', ...rest] = cleaned.split('.');
  const decimals = rest.join('').slice(0, 2);
  const value = Number(decimals ? `${integer}.${decimals}` : integer);
  return Number.isFinite(value) ? value : null;
}

function groupInteger(integer: string): string {
  return integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

@Directive({
  selector: 'input[appCurrencyInput]',
  host: {
    '(input)': 'handleInput($event)',
    '(blur)': 'handleBlur()',
  },
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: CurrencyInputDirective,
      multi: true,
    },
  ],
})
export class CurrencyInputDirective implements ControlValueAccessor {
  private readonly element = inject(ElementRef<HTMLInputElement>);

  readonly prefix = input('', {alias: 'appCurrencyPrefix'});

  private onChange: (value: number | null) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: number | null | undefined): void {
    const input = this.element.nativeElement;
    if (value == null) {
      input.value = this.prefix();
    } else if (document.activeElement !== input) {
      input.value = this.prefix() + fixedFormatter.format(value);
    }
  }

  registerOnChange(fn: (value: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.element.nativeElement.disabled = isDisabled;
  }

  handleInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const raw = input.value;
    const digitsBeforeCaret = (raw.slice(0, input.selectionStart ?? raw.length).match(/\d/g) ?? [])
      .length;

    const cleaned = onlyNumeric(raw);
    input.value = this.prefix() + this.formatTyped(cleaned);
    this.onChange(parseCurrency(cleaned));
    this.restoreCaret(input, digitsBeforeCaret);
  }

  handleBlur(): void {
    this.onTouched();
    const input = this.element.nativeElement;
    const numeric = parseCurrency(input.value);
    input.value = numeric === null ? this.prefix() : this.prefix() + fixedFormatter.format(numeric);
  }

  private formatTyped(cleaned: string): string {
    if (!cleaned) return '';
    const [integer = '0', ...rest] = cleaned.split('.');
    const decimals = rest.join('').slice(0, 2);
    return decimals ? `${groupInteger(integer)}.${decimals}` : groupInteger(integer);
  }

  private restoreCaret(input: HTMLInputElement, digitsBeforeCaret: number): void {
    const formatted = input.value;
    let index = 0;
    let seen = 0;
    while (index < formatted.length && seen < digitsBeforeCaret) {
      if (/\d/.test(formatted[index])) seen++;
      index++;
    }
    input.setSelectionRange(index, index);
  }
}
