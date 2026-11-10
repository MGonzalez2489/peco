import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {IS_PRODUCTION} from '../constants/is-production.constant';
import {ChangelogRelease} from '../models/changelog.model';
import {ChangelogStore} from './changelog.store';

const CHANGELOG_URL = 'assets/changelog.json';

const buildReleases = (count: number): ChangelogRelease[] =>
  Array.from({length: count}, (_, index) => ({
    version: `v0.${index}.0`,
    fecha: '2026-01-01',
    highlights: [`Cambio ${index}`],
  }));

describe('ChangelogStore', () => {
  let store: InstanceType<typeof ChangelogStore>;
  let httpTesting: HttpTestingController;

  const setup = (isProduction: boolean): void => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {provide: IS_PRODUCTION, useValue: isProduction},
      ],
    });

    store = TestBed.inject(ChangelogStore);
    httpTesting = TestBed.inject(HttpTestingController);
  };

  beforeEach(() => {
    setup(false);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('starts idle with no releases and no error', () => {
    expect(store.loading()).toBe(false);
    expect(store.loaded()).toBe(false);
    expect(store.error()).toBeNull();
    expect(store.lastChanges()).toEqual([]);
  });

  it('flags loading while the request is in flight', () => {
    store.load();
    expect(store.loading()).toBe(true);

    httpTesting.expectOne(CHANGELOG_URL).flush([]);
    expect(store.loading()).toBe(false);
  });

  it('stores releases and caps the visible slice', () => {
    store.load();
    httpTesting.expectOne(CHANGELOG_URL).flush(buildReleases(8));

    expect(store.loaded()).toBe(true);
    expect(store.error()).toBeNull();
    expect(store.releases().length).toBe(8);
    expect(store.lastChanges().length).toBe(5);
  });

  it('shows draft releases outside production with the draft first', () => {
    store.load();
    httpTesting
      .expectOne(CHANGELOG_URL)
      .flush([{version: 'v0.0.11-a', _draft: true, highlights: ['Borrador']}, ...buildReleases(2)]);

    expect(store.releases().length).toBe(3);
    expect(store.lastChanges().map((release) => release.version)).toEqual([
      'v0.0.11-a',
      'v0.0.0',
      'v0.1.0',
    ]);
  });

  it('hides draft releases in production', () => {
    TestBed.resetTestingModule();
    setup(true);

    store.load();
    httpTesting
      .expectOne(CHANGELOG_URL)
      .flush([{version: 'v0.0.11-a', _draft: true, highlights: ['Borrador']}, ...buildReleases(2)]);

    expect(store.releases().length).toBe(3);
    expect(store.lastChanges().map((release) => release.version)).toEqual(['v0.0.0', 'v0.1.0']);
  });

  it('counts the draft within the visible release cap outside production', () => {
    store.load();
    httpTesting
      .expectOne(CHANGELOG_URL)
      .flush([{version: 'v0.0.11-a', _draft: true, highlights: ['Borrador']}, ...buildReleases(8)]);

    expect(store.lastChanges().length).toBe(5);
    expect(store.lastChanges()[0].version).toBe('v0.0.11-a');
  });

  it('records the error and clears releases on failure', () => {
    store.load();
    httpTesting.expectOne(CHANGELOG_URL).flush('boom', {status: 500, statusText: 'Server Error'});

    expect(store.error()).toBeTruthy();
    expect(store.loading()).toBe(false);
    expect(store.releases()).toEqual([]);
  });

  it('clears the error on retry', () => {
    store.load();
    httpTesting.expectOne(CHANGELOG_URL).error(new ProgressEvent('network'));
    expect(store.error()).toBeTruthy();

    store.load();
    httpTesting.expectOne(CHANGELOG_URL).flush(buildReleases(1));

    expect(store.error()).toBeNull();
    expect(store.loaded()).toBe(true);
  });

  it('ignores a concurrent load while one is in flight', () => {
    store.load();
    store.load();

    httpTesting.expectOne(CHANGELOG_URL).flush([]);
  });
});
