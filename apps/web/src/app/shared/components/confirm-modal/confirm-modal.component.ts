import {ChangeDetectionStrategy, Component, input, output} from '@angular/core';
import {ModalComponent} from '../modal/modal.component';
import {AppIconComponent} from '../app-icon/app-icon.component';

@Component({
  selector: 'app-confirm-modal',
  imports: [ModalComponent, AppIconComponent],
  templateUrl: './confirm-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
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
