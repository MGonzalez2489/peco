import {TestBed} from '@angular/core/testing';
import {provideRouter, Router} from '@angular/router';
import {of, throwError} from 'rxjs';
import {AuthApiService} from '@core/api/auth-api.service';
import {provideAppIcons} from '@core/icons/app-icons.provider';
import {ApiErrorPresenterService} from '@core/services/api-error-presenter.service';
import {AuthTokenStore} from '@core/stores/auth-token.store';
import {LoginComponent} from './login.component';

const auth = {
  user: {
    publicId: 'user-1',
    email: 'user@example.com',
    name: 'Usuario',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  expiresIn: 900,
  refreshExpiresIn: 1800,
};

describe('LoginComponent', () => {
  let authApi: {login: ReturnType<typeof vi.fn>};

  beforeEach(() => {
    authApi = {login: vi.fn()};

    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        provideAppIcons(),
        {provide: AuthApiService, useValue: authApi},
      ],
    });
  });

  const render = () => {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    return fixture;
  };

  const fill = (fixture: ReturnType<typeof render>, email: string, password: string): void => {
    const compiled = fixture.nativeElement as HTMLElement;
    const emailInput = compiled.querySelector<HTMLInputElement>('#login-email')!;
    const passwordInput = compiled.querySelector<HTMLInputElement>('#login-password')!;
    emailInput.value = email;
    emailInput.dispatchEvent(new Event('input'));
    passwordInput.value = password;
    passwordInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  it('renders the Spanish login form', () => {
    const compiled = render().nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Iniciar sesión');
    expect(compiled.querySelector('label[for="login-email"]')?.textContent).toContain(
      'Correo electrónico',
    );
  });

  it('does not call the API when the form is invalid', () => {
    const fixture = render();
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('button[type="submit"]')!
      .click();
    fixture.detectChanges();

    expect(authApi.login).not.toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Este campo es obligatorio.',
    );
  });

  it('authenticates, stores the pair and navigates to the dashboard', () => {
    authApi.login.mockReturnValue(of(auth));
    const fixture = render();
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    fill(fixture, ' USER@Example.com ', 'correct horse');

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('button[type="submit"]')!
      .click();

    expect(authApi.login).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'correct horse',
    });
    expect(TestBed.inject(AuthTokenStore).accessToken()).toBe('access-token');
    expect(navigate).toHaveBeenCalledWith('/dashboard');
  });

  it('presents API failures without navigating', () => {
    authApi.login.mockReturnValue(throwError(() => new Error('unavailable')));
    const fixture = render();
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    fill(fixture, 'user@example.com', 'correct horse');

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('button[type="submit"]')!
      .click();

    expect(TestBed.inject(ApiErrorPresenterService).error()).not.toBeNull();
    expect(navigate).not.toHaveBeenCalled();
  });
});
