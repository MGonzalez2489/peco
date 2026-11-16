import {inject} from '@angular/core';
import {CanActivateFn, Router} from '@angular/router';

const DESKTOP_MEDIA_QUERY = '(min-width: 768px)';

export const settingsHubGuard: CanActivateFn = () => {
  const isDesktop = globalThis.matchMedia?.(DESKTOP_MEDIA_QUERY).matches ?? false;

  return isDesktop ? inject(Router).createUrlTree(['/settings/theme']) : true;
};
