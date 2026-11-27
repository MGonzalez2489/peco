import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {of, throwError} from 'rxjs';
import {AuthApiService} from '@core/api/auth-api.service';
import {provideAppIcons} from '@core/icons/app-icons.provider';
import {ApiErrorPresenterService} from '@core/services/api-error-presenter.service';
import {ForgotPasswordComponent} from './forgot-password.component';

describe('ForgotPasswordComponent', () => {
  let authApi: {forgotPassword: ReturnType<typeof vi.fn>};

  beforeEach(() => {
    authApi = {forgotPassword: vi.fn()};

    TestBed.configureTestingModule({
      imports: [ForgotPasswordComponent],
      providers: [
        provideRouter([]),
        provideAppIcons(),
        {provide: AuthApiService, useValue: authApi},
      ],
    });
  });

  const render = () => {
    const fixture = TestBed.createComponent(ForgotPasswordComponent);
    fixture.detectChanges();
    return fixture;
  };

  const submitWith = (fixture: ReturnType<typeof render>, email: string): void => {
    const compiled = fixture.nativeElement as HTMLElement;
    const input = compiled.querySelector<HTMLInputElement>('#forgot-email')!;
    input.value = email;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    compiled.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    fixture.detectChanges();
  };

  it('does not request a reset for an invalid email', () => {
    const fixture = render();
    submitWith(fixture, 'not-an-email');

    expect(authApi.forgotPassword).not.toHaveBeenCalled();
  });

  it('requests the reset and shows the neutral confirmation', () => {
    authApi.forgotPassword.mockReturnValue(of(undefined));
    const fixture = render();

    submitWith(fixture, ' USER@Example.com ');

    expect(authApi.forgotPassword).toHaveBeenCalledWith({email: 'user@example.com'});
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Si el correo está registrado',
    );
  });

  it('presents API failures', () => {
    authApi.forgotPassword.mockReturnValue(throwError(() => new Error('unavailable')));
    const fixture = render();

    submitWith(fixture, 'user@example.com');

    expect(TestBed.inject(ApiErrorPresenterService).error()).not.toBeNull();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain(
      'Si el correo está registrado',
    );
  });
});
