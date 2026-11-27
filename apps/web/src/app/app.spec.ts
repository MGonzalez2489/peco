import {Component} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {provideRouter, Router} from '@angular/router';
import {provideAppIcons} from './core/icons/app-icons.provider';
import {AppComponent} from './app.component';

@Component({
  template: '<p>Página pública de prueba</p>',
})
class StubPublicComponent {}

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent, StubPublicComponent],
      providers: [
        provideRouter([{path: 'login', component: StubPublicComponent, data: {public: true}}]),
        provideAppIcons(),
      ],
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

  it('hides the sidebar and navbar on routes marked as public', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    await TestBed.inject(Router).navigateByUrl('/login');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Página pública de prueba');
    expect(compiled.querySelector('app-sidebar')).toBeNull();
    expect(compiled.querySelector('app-navbar')).toBeNull();
  });
});
