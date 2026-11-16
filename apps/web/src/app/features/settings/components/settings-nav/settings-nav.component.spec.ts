import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {SETTINGS_SECTIONS} from '@core/constants/settings-sections.constant';
import {provideAppIcons} from '@core/icons/app-icons.provider';
import {SettingsNavComponent} from './settings-nav.component';

describe('SettingsNavComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SettingsNavComponent],
      providers: [provideRouter([]), provideAppIcons()],
    });
  });

  it('renders a single desktop menu without the mobile tab strip', () => {
    const fixture = TestBed.createComponent(SettingsNavComponent);
    fixture.detectChanges();

    const navs = (fixture.nativeElement as HTMLElement).querySelectorAll('nav');

    expect(navs.length).toBe(1);
    expect(navs[0].classList.contains('md:hidden')).toBeFalsy();
  });

  it('renders one link per configured settings section', () => {
    const fixture = TestBed.createComponent(SettingsNavComponent);
    fixture.detectChanges();

    const hrefs = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLAnchorElement>('a'),
    ).map((link) => link.getAttribute('href'));

    expect(hrefs.length).toBe(SETTINGS_SECTIONS.length);
    for (const section of SETTINGS_SECTIONS) {
      expect(hrefs).toContain(`/settings/${section.path}`);
    }
  });

  it('renders the category group headings', () => {
    const fixture = TestBed.createComponent(SettingsNavComponent);
    fixture.detectChanges();

    const headings = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('h2')).map(
      (heading) => heading.textContent?.trim(),
    );

    expect(headings).toContain('Preferencias');
    expect(headings).toContain('Datos y seguridad');
    expect(headings).toContain('Información');
  });
});
