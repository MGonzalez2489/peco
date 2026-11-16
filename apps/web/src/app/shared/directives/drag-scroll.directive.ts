import {DestroyRef, Directive, ElementRef, computed, inject, signal} from '@angular/core';

const DRAG_THRESHOLD_PX = 4;

@Directive({
  selector: '[appDragScroll]',
  host: {
    '(pointerdown)': 'onPointerDown($event)',
    '(pointermove)': 'onPointerMove($event)',
    '(pointerup)': 'onPointerUp($event)',
    '(pointercancel)': 'onPointerUp($event)',
    '(dragstart)': 'onDragStart($event)',
    '[style.cursor]': 'cursor()',
    '[style.user-select]': 'dragging() ? "none" : null',
  },
})
export class DragScrollDirective {
  private readonly host = inject(ElementRef<HTMLElement>).nativeElement;
  private readonly destroyRef = inject(DestroyRef);

  readonly scrollable = signal(false);
  readonly dragging = signal(false);

  readonly cursor = computed(() => {
    if (this.dragging()) {
      return 'grabbing';
    }
    return this.scrollable() ? 'grab' : 'auto';
  });

  private pointerId: number | null = null;
  private startX = 0;
  private startScrollLeft = 0;
  private moved = false;

  constructor() {
    const refresh = (): void => this.scrollable.set(this.isScrollable());

    const resizeObserver = new ResizeObserver(refresh);
    resizeObserver.observe(this.host);
    this.destroyRef.onDestroy(() => resizeObserver.disconnect());

    refresh();
  }

  onPointerDown(event: PointerEvent): void {
    if (event.pointerType !== 'mouse' || event.button !== 0) {
      return;
    }

    this.scrollable.set(this.isScrollable());

    if (!this.scrollable()) {
      return;
    }

    this.pointerId = event.pointerId;
    this.startX = event.clientX;
    this.startScrollLeft = this.host.scrollLeft;
    this.moved = false;
    this.dragging.set(true);
  }

  onPointerMove(event: PointerEvent): void {
    if (this.pointerId === null || event.pointerId !== this.pointerId) {
      return;
    }

    const deltaX = event.clientX - this.startX;

    if (!this.moved) {
      if (Math.abs(deltaX) < DRAG_THRESHOLD_PX) {
        return;
      }

      this.moved = true;
      // Capture only once a real drag starts: capturing on pointer down makes the
      // browser retarget the follow-up click, breaking navigation on a plain click.
      this.host.setPointerCapture(event.pointerId);
    }

    this.host.scrollLeft = this.startScrollLeft - deltaX;
  }

  onPointerUp(event: PointerEvent): void {
    if (this.pointerId === null || event.pointerId !== this.pointerId) {
      return;
    }

    if (this.moved) {
      this.swallowClick();
    }

    if (this.host.hasPointerCapture(event.pointerId)) {
      this.host.releasePointerCapture(event.pointerId);
    }

    this.pointerId = null;
    this.moved = false;
    this.dragging.set(false);
    this.scrollable.set(this.isScrollable());
  }

  onDragStart(event: DragEvent): void {
    // Cards are links: without this, dragging one starts a native link drag that
    // cancels the pointer stream and the row would never scroll.
    event.preventDefault();
  }

  private swallowClick(): void {
    const swallow = (event: Event): void => {
      event.preventDefault();
      event.stopPropagation();
      this.host.removeEventListener('click', swallow, true);
    };

    this.host.addEventListener('click', swallow, true);

    // A drag released off the row may not emit a click, so bound the listener.
    setTimeout(() => this.host.removeEventListener('click', swallow, true));
  }

  private isScrollable(): boolean {
    return this.host.scrollWidth > this.host.clientWidth + 1;
  }
}
