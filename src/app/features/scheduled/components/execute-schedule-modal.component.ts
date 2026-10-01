import {ChangeDetectionStrategy, Component, computed, effect, input, output} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {formatCurrency} from '@core/utils';
import {ModalComponent} from '@shared/components';
import {CurrencyInputDirective} from '@shared/directives';

type ExecuteForm = FormGroup<{
  amount: FormControl<number>;
}>;

@Component({
  selector: 'app-execute-schedule-modal',
  imports: [ReactiveFormsModule, ModalComponent, CurrencyInputDirective],
  templateUrl: './execute-schedule-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExecuteScheduleModalComponent {
  readonly isOpen = input(false);
  readonly name = input('');
  readonly estimatedAmount = input(0);

  readonly applied = output<number>();
  readonly closed = output<void>();

  protected readonly form: ExecuteForm = new FormGroup({
    amount: new FormControl<number>(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0.01)],
    }),
  });

  private readonly amountControl = this.form.controls.amount;

  readonly estimatedLabel = computed(() => formatCurrency(this.estimatedAmount()));

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        this.amountControl.setValue(this.estimatedAmount());
      }
    });
  }

  apply(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.applied.emit(this.amountControl.value ?? this.estimatedAmount());
  }

  useEstimate(): void {
    this.amountControl.setValue(this.estimatedAmount());
  }
}
