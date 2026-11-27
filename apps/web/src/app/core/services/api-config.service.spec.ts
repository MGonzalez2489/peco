import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {DEFAULT_API_RUNTIME_CONFIG} from '../constants/default-api-runtime-config.constant';
import {ApiConfigService} from './api-config.service';

const RUNTIME_CONFIG_URL = 'assets/config.json';

describe('ApiConfigService', () => {
  let service: ApiConfigService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ApiConfigService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('uses the local default before the runtime asset is loaded', () => {
    expect(service.apiBaseUrl).toBe(DEFAULT_API_RUNTIME_CONFIG.apiBaseUrl);
  });

  it('loads the deployed API base url from the runtime asset', () => {
    service.load().subscribe();
    httpTesting.expectOne(RUNTIME_CONFIG_URL).flush({apiBaseUrl: 'https://api.example.com/api/'});

    expect(service.apiBaseUrl).toBe('https://api.example.com/api');
  });

  it('falls back to the default when the payload is invalid', () => {
    service.load().subscribe();
    httpTesting.expectOne(RUNTIME_CONFIG_URL).flush({apiBaseUrl: 42});

    expect(service.apiBaseUrl).toBe(DEFAULT_API_RUNTIME_CONFIG.apiBaseUrl);
  });

  it('falls back to the default when the asset cannot be loaded', () => {
    service.load().subscribe();
    httpTesting.expectOne(RUNTIME_CONFIG_URL).error(new ProgressEvent('network'));

    expect(service.apiBaseUrl).toBe(DEFAULT_API_RUNTIME_CONFIG.apiBaseUrl);
  });
});
