import {Component, input, output} from '@angular/core';
import {ModalComponent} from '../modal/modal.component';

@Component({
  selector: 'app-confirm-modal',
  imports: [ModalComponent],
  templateUrl: './confirm-modal.component.html',
})
export class ConfirmModalComponent {
  readonly isOpen = input(false);
  readonly title = input('Confirm action');
  readonly confirmLabel = input('Confirm');
  readonly cancelLabel = input('Cancel');
  readonly danger = input(true);

  readonly confirmed = output<void>();
  readonly dismissed = output<void>();
}
