import {TestBed} from '@angular/core/testing';
import {ApiErrorCodeEnum} from '@peco/enums';
import {API_ERROR_UI_COPY} from '../constants/api-error-ui-copy.constant';
import {ApiClientError} from '../models/api-client-error.model';
import {ApiErrorPresenterService} from './api-error-presenter.service';

describe('ApiErrorPresenterService', () => {
  let service: ApiErrorPresenterService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ApiErrorPresenterService);
  });

  it('maps an API error to Spanish copy, field errors and correlation id', () => {
    const error = new ApiClientError(
      400,
      ApiErrorCodeEnum.VALIDATION_ERROR.toString(),
      'Datos no válidos.',
      'cid-123',
      {fields: {email: 'El correo no es válido.', ignored: 42}},
      8,
    );

    expect(service.describe(error)).toEqual({
      code: ApiErrorCodeEnum.VALIDATION_ERROR.toString(),
      title: API_ERROR_UI_COPY.title,
      message: API_ERROR_UI_COPY.messages[ApiErrorCodeEnum.VALIDATION_ERROR.toString()],
      fieldErrors: {email: 'El correo no es válido.'},
      correlationId: 'cid-123',
      retryAfterSeconds: 8,
    });
  });

  it('falls back to a generic internal error for unknown failures', () => {
    expect(service.describe(new Error('boom'))).toEqual({
      code: ApiErrorCodeEnum.INTERNAL_ERROR.toString(),
      title: API_ERROR_UI_COPY.title,
      message: API_ERROR_UI_COPY.fallbackMessage,
      fieldErrors: {},
      correlationId: 'unavailable',
    });
  });

  it('publishes and dismisses the global alert', () => {
    expect(service.error()).toBeNull();

    service.present(new Error('boom'));
    expect(service.error()?.code).toBe(ApiErrorCodeEnum.INTERNAL_ERROR.toString());

    service.dismiss();
    expect(service.error()).toBeNull();
  });
});
