import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {FormBuilder, ReactiveFormsModule} from '@angular/forms';
import {ActivatedRoute, RouterLink} from '@angular/router';
import {finalize} from 'rxjs';
import {AuthApiService} from '@core/api/auth-api.service';
import {AUTH_VALIDATORS} from '@core/constants';
import {AppIconComponent} from '@shared/components/app-icon/app-icon.component';
import {ApiErrorPresenterService} from '@core/services/api-error-presenter.service';
import {authControlError, passwordsMatch} from '@core/utils';
import {AuthLayoutComponent} from '../auth-layout/auth-layout.component';

/** Completes a password reset using the single-use token from the email link. */
@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink, AppIconComponent, AuthLayoutComponent],
  templateUrl: './reset-password.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authApi = inject(AuthApiService);
  private readonly errorPresenter = inject(ApiErrorPresenterService);
  private readonly route = inject(ActivatedRoute);

  protected readonly errorFor = authControlError;
  protected readonly tokenMissing = !this.route.snapshot.queryParamMap.get('token');
  protected readonly completed = signal(false);
  protected readonly submitting = signal(false);
  protected readonly showPassword = signal(false);

  protected readonly form = this.fb.group(
    {
      token: this.fb.control(this.route.snapshot.queryParamMap.get('token') ?? '', {
        nonNullable: true,
        validators: AUTH_VALIDATORS.token,
      }),
      newPassword: this.fb.control('', {
        nonNullable: true,
        validators: AUTH_VALIDATORS.password,
      }),
      confirmPassword: this.fb.control('', {
        nonNullable: true,
        validators: AUTH_VALIDATORS.password,
      }),
    },
    {validators: [passwordsMatch('newPassword', 'confirmPassword')]},
  );

  protected submit(): void {
    if (this.form.invalid || this.tokenMissing) {
      this.form.markAllAsTouched();
      return;
    }

    const {token, newPassword} = this.form.getRawValue();
    this.submitting.set(true);
    this.authApi
      .resetPassword({token, newPassword})
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => this.completed.set(true),
        error: (error: unknown) => this.errorPresenter.present(error),
      });
  }
}
