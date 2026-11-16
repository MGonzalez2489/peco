import {ChangeDetectionStrategy, Component, input, output} from '@angular/core';
import {Category} from '@core/models';
import {AppIconComponent, ModalComponent} from '@shared/components';

@Component({
  selector: 'app-category-delete-confirm-modal',
  imports: [ModalComponent, AppIconComponent],
  templateUrl: './category-delete-confirm-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryDeleteConfirmModalComponent {
  readonly isOpen = input(false);
  readonly category = input<Category | null>(null);

  readonly close = output<void>();
  readonly confirm = output<void>();
}
