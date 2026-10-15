import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from '@angular/forms';
import {formatLocalDate} from '@core/utils';
import {DateInputDirective} from '@shared/directives';
import {AppIconComponent} from '../app-icon/app-icon.component';
import {DatePickerBottomSheetComponent} from '../date-picker-bottom-sheet/date-picker-bottom-sheet.component';

const DESKTOP_MEDIA_QUERY = '(min-width: 640px)';

@Component({
  selector: 'app-date-picker',
  imports: [AppIconComponent, DateInputDirective, DatePickerBottomSheetComponent],
  templateUrl: './date-picker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{provide: NG_VALUE_ACCESSOR, useExisting: DatePickerComponent, multi: true}],
  host: {class: 'relative block'},
})
export class DatePickerComponent implements ControlValueAccessor {
  readonly controlId = input('');
  readonly ariaLabel = input('');
  readonly min = input<string | null>(null);
  readonly max = input<string | null>(null);
  readonly invalid = input(false);
  readonly placeholder = input('Selecciona una fecha');

  protected readonly value = signal<string | null>(null);
  protected readonly disabled = signal(false);
  protected readonly sheetOpen = signal(false);

  private readonly destroyRef = inject(DestroyRef);
  private readonly triggerRef = viewChild<ElementRef<HTMLButtonElement>>('sheetTrigger');

  private readonly desktopMedia = window.matchMedia?.(DESKTOP_MEDIA_QUERY) ?? null;

  /**
   * Falls back to the desktop input when `matchMedia` is unavailable (e.g. SSR),
   * preserving the native picker as the safe default.
   */
  protected readonly isDesktop = signal(this.desktopMedia?.matches ?? true);

  protected readonly displayValue = computed(() => {
    const current = this.value();
    return current ? formatLocalDate(current) : this.placeholder();
  });

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  constructor() {
    const media = this.desktopMedia;
    if (media) {
      const onChange = (event: MediaQueryListEvent): void => this.isDesktop.set(event.matches);

      media.addEventListener('change', onChange);
      this.destroyRef.onDestroy(() => media.removeEventListener('change', onChange));
    }
  }

  protected onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const next = input.value || null;

    this.value.set(next);
    this.onChange(input.value);
  }

  protected onBlur(): void {
    this.onTouched();
  }

  protected openSheet(): void {
    if (this.disabled()) return;
    this.sheetOpen.set(true);
  }

  protected closeSheet(): void {
    if (!this.sheetOpen()) return;

    this.sheetOpen.set(false);
    this.triggerRef()?.nativeElement.focus();
  }

  protected onDateSelect(isoDate: string): void {
    this.value.set(isoDate);
    this.onChange(isoDate);
    this.onTouched();
    this.closeSheet();
  }

  writeValue(value: string | null): void {
    this.value.set(value ?? null);
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
}
