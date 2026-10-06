import {
  Component,
  effect,
  input,
  output,
  viewChild,
  ElementRef,
  ChangeDetectionStrategy,
} from '@angular/core';

import {AppIconComponent} from '../app-icon/app-icon.component';

@Component({
  selector: 'app-modal',
  imports: [AppIconComponent],
  templateUrl: './modal.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
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
        requestAnimationFrame(() => {
          const panel = this.panelRef()?.nativeElement;
          // Content opts in with `data-autofocus`; the panel itself is the fallback.
          const target = panel?.querySelector<HTMLElement>('[data-autofocus]');
          (target ?? panel)?.focus();

          // Selecting lets the user overwrite a pre-filled value instead of appending to it.
          if (target instanceof HTMLInputElement && target.type === 'text') {
            target.select();
          }
        });
      }
    });
  }

  closeWithEscape(): void {
    if (this.isOpen()) {
      this.closed.emit();
    }
  }
}
