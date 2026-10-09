import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import {AppIconComponent} from '../app-icon/app-icon.component';

const DESKTOP_MEDIA_QUERY = '(min-width: 768px)';

export interface MonthPickerSelection {
  month: number;
  year: number;
}

@Component({
  selector: 'app-month-picker-bottom-sheet',
  imports: [AppIconComponent],
  templateUrl: './month-picker-bottom-sheet.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'dismiss()',
  },
})
export class MonthPickerBottomSheetComponent {
  readonly isOpen = input<boolean>(false);

  readonly selectedYear = input<number>(new Date().getFullYear());
  readonly selectedMonth = input<number>(new Date().getMonth() + 1);

  readonly minDate = input<string | Date>(new Date());
  readonly maxDate = input<string | Date>(new Date());

  readonly monthSelect = output<MonthPickerSelection>();
  readonly close = output<void>();

  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  private readonly desktopMedia = window.matchMedia?.(DESKTOP_MEDIA_QUERY) ?? null;

  protected readonly isDesktop = signal(this.desktopMedia?.matches ?? false);

  readonly currentYear = linkedSignal(() => this.selectedYear());
  readonly currentMonth = linkedSignal(() => this.selectedMonth());

  readonly months = [
    'Ene',
    'Feb',
    'Mar',
    'Abr',
    'May',
    'Jun',
    'Jul',
    'Ago',
    'Sep',
    'Oct',
    'Nov',
    'Dic',
  ];

  readonly minYear = computed(() => {
    const min = this.normalizeDate(this.minDate());
    return min.getFullYear();
  });

  readonly minMonth = computed(() => {
    const min = this.normalizeDate(this.minDate());
    return min.getMonth() + 1;
  });

  readonly maxYear = computed(() => {
    const max = this.normalizeDate(this.maxDate());
    return max.getFullYear();
  });

  readonly maxMonth = computed(() => {
    const max = this.normalizeDate(this.maxDate());
    return max.getMonth() + 1;
  });

  readonly canGoToPreviousYear = computed(() => {
    return this.currentYear() > this.minYear();
  });

  readonly canGoToNextYear = computed(() => {
    return this.currentYear() < this.maxYear();
  });

  constructor() {
    const media = this.desktopMedia;
    if (media) {
      const onChange = (event: MediaQueryListEvent): void => this.isDesktop.set(event.matches);

      media.addEventListener('change', onChange);
      this.destroyRef.onDestroy(() => media.removeEventListener('change', onChange));
    }

    effect((onCleanup) => {
      if (!this.isOpen()) {
        return;
      }

      let handler: ((event: MouseEvent) => void) | null = null;
      const timeoutId = setTimeout(() => {
        handler = (event: MouseEvent): void => {
          const target = event.target;
          if (target instanceof Node && !this.elementRef.nativeElement.contains(target)) {
            this.dismiss();
          }
        };
        document.addEventListener('click', handler);
      });

      onCleanup(() => {
        clearTimeout(timeoutId);
        if (handler) {
          document.removeEventListener('click', handler);
        }
      });
    });
  }

  protected isMonthDisabled(month: number): boolean {
    const year = this.currentYear();
    const minYear = this.minYear();
    const maxYear = this.maxYear();

    if (year < minYear || year > maxYear) {
      return true;
    }
    if (year === minYear && month < this.minMonth()) {
      return true;
    }
    if (year === maxYear && month > this.maxMonth()) {
      return true;
    }
    return false;
  }

  protected selectMonth(month: number): void {
    if (this.isMonthDisabled(month)) {
      return;
    }
    this.currentMonth.set(month);

    if (this.isDesktop()) {
      this.apply();
    }
  }

  protected previousYear(): void {
    if (this.canGoToPreviousYear()) {
      this.currentYear.set(this.currentYear() - 1);
    }
  }

  protected nextYear(): void {
    if (this.canGoToNextYear()) {
      this.currentYear.set(this.currentYear() + 1);
    }
  }

  protected apply(): void {
    this.monthSelect.emit({
      month: this.currentMonth(),
      year: this.currentYear(),
    });
    this.close.emit();
  }

  protected dismiss(): void {
    if (this.isOpen()) {
      this.close.emit();
    }
  }

  private normalizeDate(date: string | Date): Date {
    if (typeof date === 'string') {
      return new Date(date);
    }
    return date;
  }
}
