import {TestBed} from '@angular/core/testing';
import {Router, provideRouter} from '@angular/router';
import {routes} from '../../app.routes';

describe('settings routes', () => {
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({providers: [provideRouter(routes)]});
    router = TestBed.inject(Router);
  });

  it('redirects legacy appearance/preferences paths to the preferences section', async () => {
    await router.navigateByUrl('/settings/appearance');
    expect(router.url).toBe('/settings/theme');

    await router.navigateByUrl('/settings/preferences');
    expect(router.url).toBe('/settings/theme');

    await router.navigateByUrl('/preferences');
    expect(router.url).toBe('/settings/theme');
  });

  it('exposes the preferences section under /settings/theme', async () => {
    await router.navigateByUrl('/settings/theme');

    expect(router.url).toBe('/settings/theme');
  });
});
