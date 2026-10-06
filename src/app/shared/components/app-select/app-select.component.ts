import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from '@angular/forms';
import {SelectOption} from '@core/models';
import {AppIconComponent} from '../app-icon/app-icon.component';

@Component({
  selector: 'app-select',
  imports: [AppIconComponent],
  templateUrl: './app-select.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{provide: NG_VALUE_ACCESSOR, useExisting: AppSelectComponent, multi: true}],
  host: {
    class: 'relative block',
    '(document:click)': 'onDocumentClick($event)',
    '(focusout)': 'onFocusOut($event)',
    '(keydown.escape)': 'onEscapeKey($event)',
  },
})
export class AppSelectComponent implements ControlValueAccessor {
  readonly options = input<SelectOption[]>([]);
  readonly placeholder = input('Selecciona una opción');
  readonly ariaLabel = input('');
  readonly controlId = input('');
  readonly invalid = input(false);

  readonly isOpen = signal(false);
  readonly activeIndex = signal(-1);
  readonly disabled = signal(false);

  private readonly selectedValue = signal<string | null>(null);
  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly triggerRef = viewChild<ElementRef<HTMLButtonElement>>('trigger');
  private readonly listRef = viewChild<ElementRef<HTMLUListElement>>('list');

  private static instanceSequence = 0;
  private readonly instanceId = `app-select-${++AppSelectComponent.instanceSequence}`;

  readonly listboxId = `${this.instanceId}-listbox`;

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  readonly selectedOption = computed(() => {
    const value = this.selectedValue();
    return this.options().find((option) => option.value === value) ?? null;
  });

  readonly accessibleLabel = computed(() => {
    const label = this.ariaLabel().trim();
    if (!label) return null;

    const option = this.selectedOption();
    return option ? `${label}: ${option.label}` : label;
  });

  readonly activeDescendantId = computed<string | null>(() => {
    if (!this.isOpen()) return null;

    const index = this.activeIndex();
    return index >= 0 && index < this.options().length ? this.optionId(index) : null;
  });

  constructor() {
    effect(() => {
      const index = this.activeIndex();
      if (!this.isOpen() || index < 0) return;

      untracked(() => {
        const option = this.listRef()?.nativeElement.children.item(index);
        if (option instanceof HTMLElement) option.scrollIntoView({block: 'nearest'});
      });
    });
  }

  optionId(index: number): string {
    return `${this.instanceId}-option-${index}`;
  }

  isSelected(value: string): boolean {
    return this.selectedValue() === value;
  }

  toggleOpen(): void {
    if (this.disabled() || this.options().length === 0) return;

    if (this.isOpen()) {
      this.closeList(false);
    } else {
      this.openList();
    }
  }

  openList(): void {
    if (this.options().length === 0) return;

    const selectedIndex = this.options().findIndex(
      (option) => option.value === this.selectedValue(),
    );

    this.isOpen.set(true);
    this.activeIndex.set(selectedIndex >= 0 ? selectedIndex : 0);
  }

  closeList(restoreFocus: boolean): void {
    if (!this.isOpen()) return;

    this.isOpen.set(false);
    this.activeIndex.set(-1);
    if (restoreFocus) this.triggerRef()?.nativeElement.focus();
  }

  setActiveIndex(index: number): void {
    if (this.activeIndex() === index) return;
    this.activeIndex.set(index);
  }

  moveActive(delta: number): void {
    const total = this.options().length;
    if (total === 0) return;

    const current = this.activeIndex();
    const next = current < 0 ? (delta > 0 ? 0 : total - 1) : (current + delta + total) % total;
    this.activeIndex.set(next);
  }

  selectActiveOption(): void {
    const option = this.options()[this.activeIndex()];
    if (option) this.selectOption(option);
  }

  selectOption(option: SelectOption): void {
    this.selectedValue.set(option.value);
    this.onChange(option.value);
    this.onTouched();
    this.closeList(true);
  }

  onKeydown(event: KeyboardEvent): void {
    if (this.disabled()) return;

    const isOpen = this.isOpen();

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (isOpen) this.moveActive(1);
        else this.openList();
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (isOpen) {
          this.moveActive(-1);
        } else {
          this.openList();
          this.activeIndex.set(this.options().length - 1);
        }
        break;
      case 'Home':
        if (!isOpen) break;
        event.preventDefault();
        this.setActiveIndex(0);
        break;
      case 'End':
        if (!isOpen) break;
        event.preventDefault();
        this.setActiveIndex(this.options().length - 1);
        break;
      case 'Enter':
      case ' ':
        if (!isOpen) break;
        event.preventDefault();
        this.selectActiveOption();
        break;
      case 'Tab':
        this.closeList(false);
        break;
    }
  }

  onEscapeKey(event: Event): void {
    if (!this.isOpen()) return;

    const keyboardEvent = event as KeyboardEvent;
    keyboardEvent.preventDefault();
    keyboardEvent.stopPropagation();
    this.closeList(true);
  }

  onDocumentClick(event: MouseEvent): void {
    if (!this.isOpen()) return;

    const target = event.target as Node | null;
    if (target && !this.hostRef.nativeElement.contains(target)) this.closeList(false);
  }

  onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (next && this.hostRef.nativeElement.contains(next)) return;

    this.onTouched();
  }

  writeValue(value: string | null): void {
    this.selectedValue.set(value ?? null);
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
