import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {ApplicationInitStatus} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {DEFAULT_API_RUNTIME_CONFIG} from '../constants/default-api-runtime-config.constant';
import {API_BASE_URL} from '../tokens/api-base-url.token';
import {provideApiConfiguration} from './api-config.provider';

const RUNTIME_CONFIG_URL = 'assets/config.json';

describe('provideApiConfiguration', () => {
  let httpTesting: HttpTestingController;

  const setup = (withProvider: boolean): void => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ...(withProvider ? [provideApiConfiguration()] : []),
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
  };

  afterEach(() => httpTesting.verify());

  it('exposes the default base url when no runtime provider is registered', () => {
    setup(false);

    expect(TestBed.inject(API_BASE_URL)).toBe(DEFAULT_API_RUNTIME_CONFIG.apiBaseUrl);
  });

  it('loads the runtime asset during app initialization and binds the token', () => {
    setup(true);

    TestBed.inject(ApplicationInitStatus);
    httpTesting.expectOne(RUNTIME_CONFIG_URL).flush({apiBaseUrl: 'https://api.example.com/api'});

    expect(TestBed.inject(API_BASE_URL)).toBe('https://api.example.com/api');
  });
});
