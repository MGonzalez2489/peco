import {TestBed} from '@angular/core/testing';
import {provideRouter, Router} from '@angular/router';
import {of, throwError} from 'rxjs';
import {AuthApiService} from '@core/api/auth-api.service';
import {provideAppIcons} from '@core/icons/app-icons.provider';
import {ApiErrorPresenterService} from '@core/services/api-error-presenter.service';
import {AuthTokenStore} from '@core/stores/auth-token.store';
import {RegisterComponent} from './register.component';

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

describe('RegisterComponent', () => {
  let authApi: {register: ReturnType<typeof vi.fn>};

  beforeEach(() => {
    authApi = {register: vi.fn()};

    TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        provideRouter([]),
        provideAppIcons(),
        {provide: AuthApiService, useValue: authApi},
      ],
    });
  });

  const render = () => {
    const fixture = TestBed.createComponent(RegisterComponent);
    fixture.detectChanges();
    return fixture;
  };

  const fill = (
    fixture: ReturnType<typeof render>,
    values: Record<'name' | 'email' | 'password' | 'confirmPassword', string>,
  ): void => {
    const compiled = fixture.nativeElement as HTMLElement;
    for (const [key, value] of Object.entries(values)) {
      const input = compiled.querySelector<HTMLInputElement>(`[formcontrolname="${key}"]`)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
    fixture.detectChanges();
  };

  const submit = (fixture: ReturnType<typeof render>): void => {
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('button[type="submit"]')!
      .click();
    fixture.detectChanges();
  };

  it('rejects mismatching passwords before calling the API', () => {
    const fixture = render();
    fill(fixture, {
      name: 'Usuario',
      email: 'user@example.com',
      password: 'correct horse',
      confirmPassword: 'another horse',
    });

    submit(fixture);

    expect(authApi.register).not.toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Las contraseñas no coinciden.',
    );
  });

  it('registers, stores the pair and navigates to the dashboard', () => {
    authApi.register.mockReturnValue(of(auth));
    const fixture = render();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fill(fixture, {
      name: ' Usuario ',
      email: ' USER@Example.com ',
      password: 'correct horse',
      confirmPassword: 'correct horse',
    });

    submit(fixture);

    expect(authApi.register).toHaveBeenCalledWith({
      name: 'Usuario',
      email: 'user@example.com',
      password: 'correct horse',
    });
    expect(TestBed.inject(AuthTokenStore).accessToken()).toBe('access-token');
    expect(navigate).toHaveBeenCalledWith('/dashboard');
  });

  it('presents API failures without navigating', () => {
    authApi.register.mockReturnValue(throwError(() => new Error('unavailable')));
    const fixture = render();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fill(fixture, {
      name: 'Usuario',
      email: 'user@example.com',
      password: 'correct horse',
      confirmPassword: 'correct horse',
    });

    submit(fixture);

    expect(TestBed.inject(ApiErrorPresenterService).error()).not.toBeNull();
    expect(navigate).not.toHaveBeenCalled();
  });
});
