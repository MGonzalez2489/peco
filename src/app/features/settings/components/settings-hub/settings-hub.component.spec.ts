import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {SETTINGS_SECTIONS} from '@core/constants/settings-sections.constant';
import {provideAppIcons} from '@core/icons/app-icons.provider';
import {SettingsHubComponent} from './settings-hub.component';

describe('SettingsHubComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SettingsHubComponent],
      providers: [provideRouter([]), provideAppIcons()],
    });
  });

  it('renders one navigation link per configured settings section', () => {
    const fixture = TestBed.createComponent(SettingsHubComponent);
    fixture.detectChanges();

    const links = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLAnchorElement>('a'),
    );
    const hrefs = links.map((link) => link.getAttribute('href'));

    expect(links.length).toBe(SETTINGS_SECTIONS.length);
    for (const section of SETTINGS_SECTIONS) {
      expect(hrefs).toContain(`/settings/${section.path}`);
    }
  });

  it('renders the title, description and icon of every section', () => {
    const fixture = TestBed.createComponent(SettingsHubComponent);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    const icons = (fixture.nativeElement as HTMLElement).querySelectorAll('app-icon').length;

    for (const section of SETTINGS_SECTIONS) {
      expect(text).toContain(section.title);
      expect(text).toContain(section.description);
    }
    expect(icons).toBeGreaterThanOrEqual(SETTINGS_SECTIONS.length);
  });

  it('groups sections under their category headings', () => {
    const fixture = TestBed.createComponent(SettingsHubComponent);
    fixture.detectChanges();

    const headings = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('h2')).map(
      (heading) => heading.textContent?.trim(),
    );

    expect(headings).toContain('Preferencias');
    expect(headings).toContain('Datos y seguridad');
    expect(headings).toContain('Información');
  });
});
