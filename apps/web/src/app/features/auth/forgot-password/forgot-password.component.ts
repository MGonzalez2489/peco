import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {FormBuilder, ReactiveFormsModule} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {finalize} from 'rxjs';
import {AuthApiService} from '@core/api/auth-api.service';
import {AUTH_VALIDATORS} from '@core/constants';
import {AppIconComponent} from '@shared/components/app-icon/app-icon.component';
import {ApiErrorPresenterService} from '@core/services/api-error-presenter.service';
import {authControlError} from '@core/utils';
import {AuthLayoutComponent} from '../auth-layout/auth-layout.component';

/** Requests a single-use password reset link without revealing account existence. */
@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink, AppIconComponent, AuthLayoutComponent],
  templateUrl: './forgot-password.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authApi = inject(AuthApiService);
  private readonly errorPresenter = inject(ApiErrorPresenterService);

  protected readonly errorFor = authControlError;
  protected readonly submitted = signal(false);
  protected readonly submitting = signal(false);

  protected readonly form = this.fb.group({
    email: this.fb.control('', {nonNullable: true, validators: AUTH_VALIDATORS.email}),
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const {email} = this.form.getRawValue();
    this.submitting.set(true);
    this.authApi
      .forgotPassword({email: email.trim().toLowerCase()})
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => this.submitted.set(true),
        error: (error: unknown) => this.errorPresenter.present(error),
      });
  }
}
