import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {FormBuilder, ReactiveFormsModule} from '@angular/forms';
import {Router, RouterLink} from '@angular/router';
import {finalize} from 'rxjs';
import {AuthApiService} from '@core/api/auth-api.service';
import {AUTH_VALIDATORS} from '@core/constants';
import {AppIconComponent} from '@shared/components/app-icon/app-icon.component';
import {ApiErrorPresenterService} from '@core/services/api-error-presenter.service';
import {AuthTokenStore} from '@core/stores/auth-token.store';
import {authControlError, passwordsMatch} from '@core/utils';
import {AuthLayoutComponent} from '../auth-layout/auth-layout.component';

/** Registration form; the API seeds the root account and logs the new user in. */
@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, AppIconComponent, AuthLayoutComponent],
  templateUrl: './register.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authApi = inject(AuthApiService);
  private readonly tokenStore = inject(AuthTokenStore);
  private readonly errorPresenter = inject(ApiErrorPresenterService);
  private readonly router = inject(Router);

  protected readonly errorFor = authControlError;
  protected readonly showPassword = signal(false);
  protected readonly submitting = signal(false);

  protected readonly form = this.fb.group(
    {
      name: this.fb.control('', {nonNullable: true, validators: AUTH_VALIDATORS.name}),
      email: this.fb.control('', {nonNullable: true, validators: AUTH_VALIDATORS.email}),
      password: this.fb.control('', {nonNullable: true, validators: AUTH_VALIDATORS.password}),
      confirmPassword: this.fb.control('', {
        nonNullable: true,
        validators: AUTH_VALIDATORS.password,
      }),
    },
    {validators: [passwordsMatch('password', 'confirmPassword')]},
  );

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const {name, email, password} = this.form.getRawValue();
    this.submitting.set(true);
    this.authApi
      .register({name: name.trim(), email: email.trim().toLowerCase(), password})
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (auth) => {
          this.tokenStore.setTokens(auth);
          void this.router.navigateByUrl('/dashboard');
        },
        error: (error: unknown) => this.errorPresenter.present(error),
      });
  }
}
