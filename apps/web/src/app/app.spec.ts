import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {provideAppIcons} from './core/icons/app-icons.provider';
import {AppComponent} from './app.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([]), provideAppIcons()],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the navbar', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-navbar')).not.toBeNull();
  });

  it('should not render the global mobile tab bar inside the navbar', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const navbar = fixture.nativeElement.querySelector('app-navbar') as HTMLElement;

    expect(navbar).not.toBeNull();
    expect(navbar.textContent).not.toContain('Movimientos');
    expect(navbar.textContent).not.toContain('Cuentas');
  });
});
