import {InjectionToken, isDevMode} from '@angular/core';

/**
 * Resolves to `true` only on optimized production builds. Local development,
 * tests and non-production deployments resolve to `false`, which keeps
 * in-progress (draft) releases visible in the changelog.
 */
export const IS_PRODUCTION = new InjectionToken<boolean>('IS_PRODUCTION', {
  providedIn: 'root',
  factory: () => !isDevMode(),
});
