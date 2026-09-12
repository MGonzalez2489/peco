import { Component, effect, input, output, viewChild, ElementRef } from '@angular/core';

@Component({
  selector: 'app-modal',
  imports: [],
  template: `
    @if (isOpen()) {
      <div
        class="backdrop-anim fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
        (click)="closed.emit()"
      >
        <div
          #panel
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          tabindex="-1"
          class="modal-panel max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl dark:bg-slate-900 sm:max-w-lg sm:rounded-2xl"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-center justify-between gap-4">
            <h2 id="modal-title" class="text-lg font-semibold leading-none text-slate-900 dark:text-white">
              {{ title() }}
            </h2>
            <button
              type="button"
              (click)="closed.emit()"
              class="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label="Cerrar"
            >
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <ng-content></ng-content>
        </div>
      </div>
    }
  `,
  styles: `
    :host {
      display: contents;
    }

    .backdrop-anim {
      animation: modal-backdrop 200ms ease-out;
    }

    .modal-panel {
      animation: modal-panel 240ms cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes modal-backdrop {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @keyframes modal-panel {
      from {
        opacity: 0;
        transform: translateY(24px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: none;
      }
    }
  `,
  host: {
    '(document:keydown.escape)': 'cerrarConEscape()',
  },
})
export class ModalComponent {
  readonly isOpen = input(false);
  readonly title = input('');

  readonly closed = output<void>();

  private readonly panelRef = viewChild<ElementRef<HTMLDivElement>>('panel');

  constructor() {
    effect(() => {
      document.body.classList.toggle('overflow-hidden', this.isOpen());
      if (this.isOpen()) {
        requestAnimationFrame(() => this.panelRef()?.nativeElement.focus());
      }
    });
  }

  cerrarConEscape(): void {
    if (this.isOpen()) {
      this.closed.emit();
    }
  }
}