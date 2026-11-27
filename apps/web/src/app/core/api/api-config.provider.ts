import {
  EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';
import {ApiConfigService} from '../services/api-config.service';
import {API_BASE_URL} from '../tokens/api-base-url.token';

/** Loads the deployable runtime config before bootstrap and binds the API base url token. */
export function provideApiConfiguration(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideAppInitializer(() => inject(ApiConfigService).load()),
    {provide: API_BASE_URL, useFactory: () => inject(ApiConfigService).apiBaseUrl},
  ]);
}
