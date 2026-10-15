import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import {formatLocalDate, toIsoDate} from '@core/utils';
import {AppIconComponent} from '../app-icon/app-icon.component';

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const WEEKDAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

const CELLS_PER_WEEK = 7;
const TOTAL_CELLS = 42;

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

interface CalendarCell {
  isoDate: string;
  day: number;
  inCurrentMonth: boolean;
  disabled: boolean;
  isToday: boolean;
}

@Component({
  selector: 'app-date-picker-bottom-sheet',
  imports: [AppIconComponent],
  templateUrl: './date-picker-bottom-sheet.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatePickerBottomSheetComponent {
  readonly isOpen = input(false);
  readonly value = input<string | null>(null);
  readonly min = input<string | null>(null);
  readonly max = input<string | null>(null);

  readonly dateSelect = output<string>();
  readonly close = output<void>();

  private readonly today = new Date();
  private readonly todayIso = toIsoDate(this.today);

  constructor() {
    effect((onCleanup) => {
      if (!this.isOpen()) return;

      // Listen during the capture phase so this sheet consumes `Escape` before an
      // enclosing modal's own document listener fires, preventing both from closing.
      const handler = (event: KeyboardEvent): void => {
        if (event.key !== 'Escape') return;

        event.preventDefault();
        event.stopPropagation();
        this.dismiss();
      };

      document.addEventListener('keydown', handler, true);
      onCleanup(() => document.removeEventListener('keydown', handler, true));
    });
  }

  readonly weekdays = WEEKDAY_LABELS;

  private readonly parsedValue = computed(() => this.parseIso(this.value()));

  readonly viewYear = linkedSignal(() => this.parsedValue()?.year ?? this.today.getFullYear());
  readonly viewMonth = linkedSignal(() => this.parsedValue()?.month ?? this.today.getMonth() + 1);

  readonly monthLabel = computed(() => `${MONTH_NAMES[this.viewMonth() - 1]} ${this.viewYear()}`);

  readonly canGoToPreviousMonth = computed(() => {
    const min = this.min();
    if (!min) return true;

    const parsed = this.parseIso(min);
    if (!parsed) return true;

    const year = this.viewYear();
    const month = this.viewMonth();
    return year > parsed.year || (year === parsed.year && month > parsed.month);
  });

  readonly canGoToNextMonth = computed(() => {
    const max = this.max();
    if (!max) return true;

    const parsed = this.parseIso(max);
    if (!parsed) return true;

    const year = this.viewYear();
    const month = this.viewMonth();
    return year < parsed.year || (year === parsed.year && month < parsed.month);
  });

  readonly cells = computed<CalendarCell[]>(() => {
    const year = this.viewYear();
    const month = this.viewMonth();

    const firstWeekday = (new Date(year, month - 1, 1).getDay() + 6) % CELLS_PER_WEEK;
    const daysInMonth = new Date(year, month, 0).getDate();
    const daysInPreviousMonth = new Date(year, month - 1, 0).getDate();

    const cells: CalendarCell[] = [];

    for (let offset = firstWeekday; offset > 0; offset--) {
      const day = daysInPreviousMonth - offset + 1;
      cells.push(this.buildCell(new Date(year, month - 2, day), false));
    }

    for (let day = 1; day <= daysInMonth; day++) {
      cells.push(this.buildCell(new Date(year, month - 1, day), true));
    }

    let nextDay = 1;
    while (cells.length < TOTAL_CELLS) {
      cells.push(this.buildCell(new Date(year, month, nextDay++), false));
    }

    return cells;
  });

  protected isSelected(isoDate: string): boolean {
    return this.value() === isoDate;
  }

  protected cellClass(cell: CalendarCell): string {
    const base =
      'flex h-10 items-center justify-center rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-30';

    if (this.isSelected(cell.isoDate)) {
      return `${base} bg-indigo-600 text-white`;
    }
    if (!cell.inCurrentMonth) {
      return `${base} text-slate-300 dark:text-slate-600`;
    }
    if (cell.isToday) {
      return `${base} text-indigo-600 ring-1 ring-indigo-300 ring-inset dark:text-indigo-400 dark:ring-indigo-500/40`;
    }
    return `${base} text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800`;
  }

  protected cellAriaLabel(cell: CalendarCell): string {
    return formatLocalDate(cell.isoDate);
  }

  protected previousMonth(): void {
    if (!this.canGoToPreviousMonth()) return;

    const month = this.viewMonth();
    if (month === 1) {
      this.viewMonth.set(12);
      this.viewYear.update((year) => year - 1);
    } else {
      this.viewMonth.set(month - 1);
    }
  }

  protected nextMonth(): void {
    if (!this.canGoToNextMonth()) return;

    const month = this.viewMonth();
    if (month === 12) {
      this.viewMonth.set(1);
      this.viewYear.update((year) => year + 1);
    } else {
      this.viewMonth.set(month + 1);
    }
  }

  protected select(cell: CalendarCell): void {
    if (cell.disabled) return;

    this.dateSelect.emit(cell.isoDate);
    this.close.emit();
  }

  protected dismiss(): void {
    if (this.isOpen()) {
      this.close.emit();
    }
  }

  private buildCell(date: Date, inCurrentMonth: boolean): CalendarCell {
    const isoDate = toIsoDate(date);
    return {
      isoDate,
      day: date.getDate(),
      inCurrentMonth,
      disabled: this.isDisabled(isoDate),
      isToday: isoDate === this.todayIso,
    };
  }

  private isDisabled(isoDate: string): boolean {
    const min = this.min();
    const max = this.max();
    if (min && isoDate < min) return true;
    if (max && isoDate > max) return true;
    return false;
  }

  private parseIso(isoDate: string | null): {year: number; month: number; day: number} | null {
    if (!isoDate) return null;

    const match = ISO_DATE_PATTERN.exec(isoDate);
    if (!match) return null;

    return {year: Number(match[1]), month: Number(match[2]), day: Number(match[3])};
  }
}
