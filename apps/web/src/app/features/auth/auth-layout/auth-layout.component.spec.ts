import {TestBed} from '@angular/core/testing';
import {provideAppIcons} from '@core/icons/app-icons.provider';
import {AuthLayoutComponent} from './auth-layout.component';

describe('AuthLayoutComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AuthLayoutComponent],
      providers: [provideAppIcons()],
    });
  });

  it('renders the page title and subtitle', () => {
    const fixture = TestBed.createComponent(AuthLayoutComponent);
    fixture.componentRef.setInput('title', 'Iniciar sesión');
    fixture.componentRef.setInput('subtitle', 'Bienvenido de nuevo');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Iniciar sesión');
    expect(compiled.textContent).toContain('Bienvenido de nuevo');
  });
});
