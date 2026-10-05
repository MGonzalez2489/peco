import {TestBed} from '@angular/core/testing';
import {provideAppIcons} from '@core/icons/app-icons.provider';
import {CategoriesSettingsComponent} from './categories-settings.component';

describe('CategoriesSettingsComponent', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [CategoriesSettingsComponent],
      providers: [provideAppIcons()],
    });
  });

  it('renders every category with a resolvable lucide icon', () => {
    const fixture = TestBed.createComponent(CategoriesSettingsComponent);
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('li') as NodeListOf<HTMLLIElement>;
    const icons = fixture.nativeElement.querySelectorAll('app-icon svg') as NodeListOf<SVGElement>;

    expect(rows.length).toBeGreaterThan(0);
    expect(icons.length).toBeGreaterThan(0);
  });

  it('shows the root category as locked without edit or delete actions', () => {
    const fixture = TestBed.createComponent(CategoriesSettingsComponent);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const locked = Array.from(element.querySelectorAll('li')).find((row) =>
      row.textContent?.includes('Predeterminada'),
    );

    expect(locked).toBeDefined();
    expect(locked?.querySelector('button')).toBeNull();
  });
});
