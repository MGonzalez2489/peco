import {TestBed} from '@angular/core/testing';
import {API_ERROR_UI_COPY} from '@core/constants/api-error-ui-copy.constant';
import {ApiErrorCodeEnum} from '@peco/enums';
import {provideAppIcons} from '@core/icons/app-icons.provider';
import {ApiClientError} from '@core/models/api-client-error.model';
import {ApiErrorPresenterService} from '@core/services/api-error-presenter.service';
import {ApiErrorAlertComponent} from './api-error-alert.component';

describe('ApiErrorAlertComponent', () => {
  let presenter: ApiErrorPresenterService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ApiErrorAlertComponent],
      providers: [provideAppIcons()],
    });
    presenter = TestBed.inject(ApiErrorPresenterService);
  });

  const render = (): HTMLElement => {
    const fixture = TestBed.createComponent(ApiErrorAlertComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('does not render an alert when there is no error', () => {
    expect(render().querySelector('[role="alert"]')).toBeNull();
  });

  it('announces the Spanish message, field errors, code and correlation id', () => {
    presenter.present(
      new ApiClientError(
        429,
        ApiErrorCodeEnum.RATE_LIMITED.toString(),
        'Demasiadas solicitudes.',
        'cid-429',
        {fields: {email: 'El correo no es válido.'}},
        12,
      ),
    );

    const alert = render().querySelector('[role="alert"]');
    expect(alert).not.toBeNull();
    expect(alert?.getAttribute('aria-live')).toBe('assertive');

    const text = alert?.textContent ?? '';
    expect(text).toContain(API_ERROR_UI_COPY.messages[ApiErrorCodeEnum.RATE_LIMITED.toString()]);
    expect(text).toContain('El correo no es válido.');
    expect(text).toContain(ApiErrorCodeEnum.RATE_LIMITED.toString());
    expect(text).toContain('cid-429');
    expect(text).toContain('12 segundos');
  });

  it('dismisses the alert from its Spanish close button', () => {
    presenter.present(new Error('boom'));
    const fixture = TestBed.createComponent(ApiErrorAlertComponent);
    fixture.detectChanges();

    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '[role="alert"] button',
    );
    expect(button?.getAttribute('aria-label')).toBe('Cerrar aviso de error');

    button?.click();
    fixture.detectChanges();

    expect(presenter.error()).toBeNull();
    expect((fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')).toBeNull();
  });
});
