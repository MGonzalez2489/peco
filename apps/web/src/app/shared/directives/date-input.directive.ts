import {Directive, ElementRef, inject} from '@angular/core';

@Directive({
  selector: 'input[type=date]',
  host: {
    '(click)': 'openPicker()',
  },
})
export class DateInputDirective {
  private readonly element = inject(ElementRef<HTMLInputElement>);

  openPicker(): void {
    const input = this.element.nativeElement;
    if (typeof input.showPicker !== 'function') return;

    try {
      input.showPicker();
    } catch {
      // Browsers can refuse the call outside a trusted gesture; the native indicator still works.
    }
  }
}
