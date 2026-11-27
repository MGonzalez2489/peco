import {TestBed} from '@angular/core/testing';
import {ActivatedRoute, convertToParamMap, provideRouter} from '@angular/router';
import {of, throwError} from 'rxjs';
import {AuthApiService} from '@core/api/auth-api.service';
import {provideAppIcons} from '@core/icons/app-icons.provider';
import {ApiErrorPresenterService} from '@core/services/api-error-presenter.service';
import {ResetPasswordComponent} from './reset-password.component';

const routeWithToken = (token: string | null) => ({
  provide: ActivatedRoute,
  useValue: {snapshot: {queryParamMap: convertToParamMap(token ? {token} : {})}},
});

describe('ResetPasswordComponent', () => {
  let authApi: {resetPassword: ReturnType<typeof vi.fn>};

  beforeEach(() => {
    authApi = {resetPassword: vi.fn()};

    TestBed.configureTestingModule({
      imports: [ResetPasswordComponent],
      providers: [
        provideRouter([]),
        provideAppIcons(),
        {provide: AuthApiService, useValue: authApi},
        routeWithToken('reset-token'),
      ],
    });
  });

  const render = () => {
    const fixture = TestBed.createComponent(ResetPasswordComponent);
    fixture.detectChanges();
    return fixture;
  };

  const submitWith = (
    fixture: ReturnType<typeof render>,
    newPassword: string,
    confirmPassword: string,
  ): void => {
    const compiled = fixture.nativeElement as HTMLElement;
    const passwordInput = compiled.querySelector<HTMLInputElement>('#reset-password')!;
    const confirmInput = compiled.querySelector<HTMLInputElement>('#reset-confirm-password')!;
    passwordInput.value = newPassword;
    passwordInput.dispatchEvent(new Event('input'));
    confirmInput.value = confirmPassword;
    confirmInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    compiled.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    fixture.detectChanges();
  };

  it('resets the password with the token from the query string', () => {
    authApi.resetPassword.mockReturnValue(of(undefined));
    const fixture = render();

    submitWith(fixture, 'correct horse', 'correct horse');

    expect(authApi.resetPassword).toHaveBeenCalledWith({
      token: 'reset-token',
      newPassword: 'correct horse',
    });
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Tu contraseña se actualizó correctamente.',
    );
  });

  it('rejects mismatching passwords', () => {
    const fixture = render();
    submitWith(fixture, 'correct horse', 'another horse');

    expect(authApi.resetPassword).not.toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Las contraseñas no coinciden.',
    );
  });

  it('presents API failures', () => {
    authApi.resetPassword.mockReturnValue(throwError(() => new Error('unavailable')));
    const fixture = render();

    submitWith(fixture, 'correct horse', 'correct horse');

    expect(TestBed.inject(ApiErrorPresenterService).error()).not.toBeNull();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain(
      'Tu contraseña se actualizó correctamente.',
    );
  });

  it('refuses to submit when the link has no token', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ResetPasswordComponent],
      providers: [
        provideRouter([]),
        provideAppIcons(),
        {provide: AuthApiService, useValue: authApi},
        routeWithToken(null),
      ],
    });

    const fixture = TestBed.createComponent(ResetPasswordComponent);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'El enlace de recuperación no es válido.',
    );
    expect(authApi.resetPassword).not.toHaveBeenCalled();
  });
});
