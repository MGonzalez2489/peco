import {Directive, ElementRef, inject, input} from '@angular/core';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from '@angular/forms';

const fixedFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function onlyNumeric(raw: string, allowNegative: boolean): string {
  const digits = raw.replace(/[^\d.]/g, '');
  return allowNegative && raw.trimStart().startsWith('-') ? `-${digits}` : digits;
}

function parseCurrency(raw: string, allowNegative: boolean): number | null {
  const cleaned = onlyNumeric(raw, allowNegative);
  if (!cleaned || cleaned === '.' || cleaned === '-') return null;
  const negative = cleaned.startsWith('-');
  const unsigned = negative ? cleaned.slice(1) : cleaned;
  const [integer = '0', ...rest] = unsigned.split('.');
  const decimals = rest.join('').slice(0, 2);
  const value = Number(decimals ? `${integer}.${decimals}` : integer);
  if (!Number.isFinite(value)) return null;
  return negative ? -value : value;
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

  readonly allowNegative = input(false, {alias: 'appCurrencyAllowNegative'});

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

    const cleaned = onlyNumeric(raw, this.allowNegative());
    input.value = this.prefix() + this.formatTyped(cleaned);
    this.onChange(parseCurrency(cleaned, this.allowNegative()));
    this.restoreCaret(input, digitsBeforeCaret);
  }

  handleBlur(): void {
    this.onTouched();
    const input = this.element.nativeElement;
    const numeric = parseCurrency(input.value, this.allowNegative());
    input.value = numeric === null ? this.prefix() : this.prefix() + fixedFormatter.format(numeric);
  }

  private formatTyped(cleaned: string): string {
    if (!cleaned || cleaned === '-') return cleaned;
    const negative = cleaned.startsWith('-');
    const unsigned = negative ? cleaned.slice(1) : cleaned;
    const [integer = '0', ...rest] = unsigned.split('.');
    const decimals = rest.join('').slice(0, 2);
    const formatted = decimals ? `${groupInteger(integer)}.${decimals}` : groupInteger(integer);
    return negative ? `-${formatted}` : formatted;
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
