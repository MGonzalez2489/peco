import {Component, effect, input, output, viewChild, ElementRef} from '@angular/core';

@Component({
  selector: 'app-modal',
  imports: [],
  templateUrl: './modal.component.html',
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
    '(document:keydown.escape)': 'closeWithEscape()',
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

  closeWithEscape(): void {
    if (this.isOpen()) {
      this.closed.emit();
    }
  }
}
