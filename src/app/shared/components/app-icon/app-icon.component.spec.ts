import {TestBed} from '@angular/core/testing';
import {provideAppIcons} from '@core/icons/app-icons.provider';
import {AppIconComponent} from './app-icon.component';

describe('AppIconComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AppIconComponent],
      providers: [provideAppIcons()],
    });
  });

  it('renders an svg with the given name, size and classes', () => {
    const fixture = TestBed.createComponent(AppIconComponent);
    fixture.componentRef.setInput('name', 'search');
    fixture.componentRef.setInput('size', 18);
    fixture.componentRef.setInput('class', 'text-gray-400');
    fixture.detectChanges();

    const svg = fixture.nativeElement.querySelector('svg') as SVGElement | null;

    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('width')).toBe('18');
    expect(svg?.classList.contains('text-gray-400')).toBe(true);
    expect(svg?.innerHTML).toContain('path');
  });

  it('falls back to the default size of 20', () => {
    const fixture = TestBed.createComponent(AppIconComponent);
    fixture.componentRef.setInput('name', 'x');
    fixture.detectChanges();

    const svg = fixture.nativeElement.querySelector('svg') as SVGElement | null;

    expect(svg?.getAttribute('width')).toBe('20');
  });
});