import {provideHttpClient, withInterceptors} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {EnvironmentProviders, makeEnvironmentProviders} from '@angular/core';
import {API_INTERCEPTORS} from '../constants/api-interceptors.constant';
import {API_BASE_URL} from '../tokens/api-base-url.token';

/** Registers the real HTTP chain with the testing backend for API specs. */
export const provideApiTesting = (): EnvironmentProviders =>
  makeEnvironmentProviders([
    provideHttpClient(withInterceptors(API_INTERCEPTORS)),
    provideHttpClientTesting(),
    {provide: API_BASE_URL, useValue: 'https://api.example.com/api'},
  ]);
