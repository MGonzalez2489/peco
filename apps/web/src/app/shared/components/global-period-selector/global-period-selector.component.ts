import {DOCUMENT} from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import {GlobalPeriodStore} from '@core/stores/global-period.store';
import {AppIconComponent} from '../app-icon/app-icon.component';
import {
  MonthPickerBottomSheetComponent,
  MonthPickerSelection,
} from '../month-picker-bottom-sheet/month-picker-bottom-sheet.component';

const PERIOD_YEARS_BACK = 10;
const PERIOD_YEARS_AHEAD = 2;
const MOBILE_MEDIA_QUERY = '(max-width: 767.98px)';

/**
 * Global month selector rendered in the navbar. Every view follows the period
 * picked here, and the `Ir a hoy` shortcut returns to the current month.
 */
@Component({
  selector: 'app-global-period-selector',
  imports: [AppIconComponent, MonthPickerBottomSheetComponent],
  templateUrl: './global-period-selector.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlobalPeriodSelectorComponent implements AfterViewInit {
  private readonly globalPeriodStore = inject(GlobalPeriodStore);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly pickerRef = viewChild(MonthPickerBottomSheetComponent, {
    read: ElementRef<HTMLElement>,
  });
  private readonly mobileMedia = window.matchMedia?.(MOBILE_MEDIA_QUERY) ?? null;
  private pickerPlaceholder: Comment | null = null;

  readonly selectedYear = this.globalPeriodStore.selectedYear;
  readonly selectedMonth = this.globalPeriodStore.selectedMonth;
  readonly formattedPeriodLabel = this.globalPeriodStore.formattedPeriodLabel;
  readonly formattedPeriodLabelCompact = this.globalPeriodStore.formattedPeriodLabelCompact;
  readonly isCurrentPeriod = this.globalPeriodStore.isCurrentPeriod;

  readonly isPickerOpen = signal(false);

  readonly minDate = computed(() => {
    const now = new Date();
    return new Date(now.getFullYear() - PERIOD_YEARS_BACK, 0, 1);
  });

  readonly maxDate = computed(() => {
    const now = new Date();
    return new Date(now.getFullYear() + PERIOD_YEARS_AHEAD, 11, 31);
  });

  /**
   * The navbar uses `backdrop-blur`, which creates a containing block for
   * fixed descendants. On mobile the picker host is moved to `<body>` so the
   * bottom sheet covers the viewport instead of being clipped by the nav. On
   * desktop it stays anchored inside the selector as a popover.
   */
  ngAfterViewInit(): void {
    const picker = this.pickerRef()?.nativeElement;
    const parent = picker?.parentNode;

    if (picker && parent) {
      this.pickerPlaceholder = this.document.createComment('global-period-picker');
      parent.insertBefore(this.pickerPlaceholder, picker);
    }

    this.syncPickerHost();

    const onChange = (): void => this.syncPickerHost();
    this.mobileMedia?.addEventListener('change', onChange);

    this.destroyRef.onDestroy(() => {
      this.mobileMedia?.removeEventListener('change', onChange);
      picker?.remove();
      this.pickerPlaceholder?.remove();
    });
  }

  private syncPickerHost(): void {
    const picker = this.pickerRef()?.nativeElement;
    const placeholder = this.pickerPlaceholder;

    if (!picker || !placeholder) return;

    // Without `matchMedia` (for example in tests) behave as the mobile sheet.
    const isMobile = this.mobileMedia ? this.mobileMedia.matches : true;

    if (isMobile) {
      if (picker.parentNode !== this.document.body) {
        this.document.body.appendChild(picker);
      }
      return;
    }

    if (placeholder.parentNode && picker.parentNode !== placeholder.parentNode) {
      placeholder.parentNode.insertBefore(picker, placeholder.nextSibling);
    }
  }

  togglePicker(): void {
    this.isPickerOpen.update((isOpen) => !isOpen);
  }

  closePicker(): void {
    this.isPickerOpen.set(false);
  }

  onMonthSelected(selection: MonthPickerSelection): void {
    this.globalPeriodStore.setPeriod(selection.year, selection.month);
    this.closePicker();
  }

  goToToday(): void {
    this.globalPeriodStore.resetToCurrentPeriod();
    this.closePicker();
  }
}
