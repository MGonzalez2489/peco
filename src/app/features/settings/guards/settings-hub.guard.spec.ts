import {TestBed} from '@angular/core/testing';
import {CanActivateFn, provideRouter, Router, UrlTree} from '@angular/router';
import {settingsHubGuard} from './settings-hub.guard';

describe('settingsHubGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => settingsHubGuard(...guardParameters));

  const setViewport = (isDesktop: boolean): void => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({matches: isDesktop}));
  };

  beforeEach(() => {
    TestBed.configureTestingModule({providers: [provideRouter([])]});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('allows the settings hub on mobile viewports', () => {
    setViewport(false);

    expect(executeGuard({} as never, {} as never)).toBe(true);
  });

  it('redirects desktop viewports to the default settings section', () => {
    setViewport(true);

    const result = executeGuard({} as never, {} as never);

    expect(result).toBeInstanceOf(UrlTree);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/settings/theme');
  });
});
