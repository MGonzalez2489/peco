import {Component} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {CurrencyInputDirective} from './currency-input.directive';

@Component({
  imports: [ReactiveFormsModule, CurrencyInputDirective],
  template: `
    <input
      appCurrencyInput
      [appCurrencyAllowNegative]="allowNegative"
      [formControl]="control"
      type="text"
    />
  `,
})
class CurrencyInputHostComponent {
  readonly control = new FormControl<number | null>(null);
  allowNegative = false;
}

describe('CurrencyInputDirective', () => {
  let fixture: ComponentFixture<CurrencyInputHostComponent>;

  const input = (): HTMLInputElement => {
    const element = fixture.nativeElement.querySelector('input');
    if (!element) throw new Error('input must be rendered');
    return element;
  };

  const type = (value: string): void => {
    const element = input();
    element.value = value;
    element.dispatchEvent(new Event('input', {bubbles: true}));
    fixture.detectChanges();
  };

  const typeCharacter = (character: string): void => {
    const element = input();
    const start = element.selectionStart ?? element.value.length;
    const end = element.selectionEnd ?? start;
    element.value = element.value.slice(0, start) + character + element.value.slice(end);
    element.setSelectionRange(start + character.length, start + character.length);
    element.dispatchEvent(new Event('input', {bubbles: true}));
    fixture.detectChanges();
  };

  const typeSequentially = (value: string): void => {
    for (const character of value) typeCharacter(character);
  };

  const create = (allowNegative = false): void => {
    fixture = TestBed.createComponent(CurrencyInputHostComponent);
    fixture.componentInstance.allowNegative = allowNegative;
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({imports: [CurrencyInputHostComponent]});
    create();
  });

  it('truncates the value to at most two decimals', () => {
    type('12.345');

    expect(input().value).toBe('12.34');
    expect(fixture.componentInstance.control.value).toBe(12.34);
  });

  it('groups the integer part while typing', () => {
    type('1234.5');

    expect(input().value).toBe('1,234.5');
    expect(fixture.componentInstance.control.value).toBe(1234.5);
  });

  it('keeps the decimal point while typing digits one by one', () => {
    typeSequentially('1250.75');

    expect(input().value).toBe('1,250.75');
    expect(fixture.componentInstance.control.value).toBe(1250.75);
  });

  it('keeps a trailing decimal point until the first decimal digit arrives', () => {
    typeSequentially('12.');

    expect(input().value).toBe('12.');
    expect(fixture.componentInstance.control.value).toBe(12);

    typeCharacter('5');

    expect(input().value).toBe('12.5');
    expect(fixture.componentInstance.control.value).toBe(12.5);
  });

  it('truncates a third sequential decimal digit', () => {
    typeSequentially('12.345');

    expect(input().value).toBe('12.34');
    expect(fixture.componentInstance.control.value).toBe(12.34);
  });

  it('rejects a minus sign unless negative values are allowed', () => {
    type('-15');

    expect(fixture.componentInstance.control.value).toBe(15);
    expect(input().value).toBe('15');
  });

  it('accepts a minus sign when negative values are allowed', () => {
    create(true);

    type('-15');

    expect(fixture.componentInstance.control.value).toBe(-15);
    expect(input().value).toBe('-15');
  });

  it('formats the value to two decimals on blur', () => {
    type('12.3');

    input().dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(input().value).toBe('12.30');
  });
});
