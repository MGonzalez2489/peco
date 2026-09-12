import {Component, input, output} from '@angular/core';
import {ModalComponent} from '../modal/modal.component';

@Component({
  selector: 'app-confirm-modal',
  imports: [ModalComponent],
  templateUrl: './confirm-modal.component.html',
})
export class ConfirmModalComponent {
  readonly isOpen = input(false);
  readonly title = input('Confirmar acción');
  readonly confirmLabel = input('Confirmar');
  readonly cancelLabel = input('Cancelar');
  readonly danger = input(true);

  readonly confirmed = output<void>();
  readonly dismissed = output<void>();
}
