import {ApplicationConfig, provideBrowserGlobalErrorListeners, isDevMode} from '@angular/core';
import {provideHttpClient, withInterceptors} from '@angular/common/http';
import {provideRouter} from '@angular/router';

import {routes} from './app.routes';
import {provideServiceWorker} from '@angular/service-worker';
import {API_INTERCEPTORS} from './core/constants/api-interceptors.constant';
import {provideApiConfiguration} from './core/api/api-config.provider';
import {provideAppIcons} from './core/icons/app-icons.provider';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors(API_INTERCEPTORS)),
    provideApiConfiguration(),
    provideRouter(routes),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    provideAppIcons(),
  ],
};
