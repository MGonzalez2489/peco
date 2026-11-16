import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {IS_PRODUCTION} from '@core/constants/is-production.constant';
import {provideAppIcons} from '@core/icons/app-icons.provider';
import {ChangelogRelease} from '@core/models/changelog.model';
import {ChangelogSettingsComponent} from './changelog-settings.component';

const CHANGELOG_URL = 'assets/changelog.json';

const RELEASES: ChangelogRelease[] = [
  {version: 'v0.0.11-a', _draft: true, highlights: ['Borrador en progreso']},
  {version: 'v0.0.10-a', fecha: '2026-10-21', highlights: ['Versión publicada']},
];

describe('ChangelogSettingsComponent', () => {
  let httpTesting: HttpTestingController;

  const setup = (isProduction: boolean): void => {
    TestBed.configureTestingModule({
      imports: [ChangelogSettingsComponent],
      providers: [
        provideAppIcons(),
        provideHttpClient(),
        provideHttpClientTesting(),
        {provide: IS_PRODUCTION, useValue: isProduction},
      ],
    });

    httpTesting = TestBed.inject(HttpTestingController);
  };

  afterEach(() => {
    httpTesting.verify();
  });

  const render = (isProduction: boolean): HTMLElement => {
    setup(isProduction);

    const fixture = TestBed.createComponent(ChangelogSettingsComponent);
    httpTesting.expectOne(CHANGELOG_URL).flush(RELEASES);
    fixture.detectChanges();

    return fixture.nativeElement as HTMLElement;
  };

  it('renders the draft with yellow styling and the Siguiente versión badge outside production', () => {
    const element = render(false);
    const rows = Array.from(element.querySelectorAll('ol > li'));

    expect(rows.length).toBe(2);

    const draftRow = rows[0];
    expect(draftRow.textContent).toContain('Siguiente versión');
    expect(draftRow.textContent).toContain('En preparación');
    expect(draftRow.textContent).not.toContain('Última versión');
    expect(draftRow.querySelector('.bg-amber-100')).not.toBeNull();
    expect(draftRow.querySelector('.bg-amber-500')).not.toBeNull();

    const publishedRow = rows[1];
    expect(publishedRow.textContent).toContain('Última versión');
    expect(publishedRow.textContent).toContain('v0.0.10-a');
  });

  it('omits the draft release in production', () => {
    const element = render(true);
    const rows = Array.from(element.querySelectorAll('ol > li'));

    expect(rows.length).toBe(1);
    expect(element.textContent).not.toContain('Siguiente versión');
    expect(element.textContent).not.toContain('v0.0.11-a');
    expect(rows[0].textContent).toContain('Última versión');
  });
});
