import {ChangeDetectionStrategy, Component, computed, effect, input, output} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {formatCentsToCurrency, fromCents, toCents} from '@core/utils';
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
  /** Estimated amount in integer cents. */
  readonly estimatedAmount = input(0);

  /** Emits the applied amount in integer cents. */
  readonly applied = output<number>();
  readonly closed = output<void>();

  protected readonly form: ExecuteForm = new FormGroup({
    amount: new FormControl<number>(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0.01)],
    }),
  });

  private readonly amountControl = this.form.controls.amount;

  readonly estimatedLabel = computed(() => formatCentsToCurrency(this.estimatedAmount()));

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        this.amountControl.setValue(fromCents(this.estimatedAmount()));
      }
    });
  }

  apply(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.applied.emit(toCents(this.amountControl.value));
  }

  useEstimate(): void {
    this.amountControl.setValue(fromCents(this.estimatedAmount()));
  }
}
