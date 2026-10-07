import {Location} from '@angular/common';
import {Component} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideRouter, Router, RouterOutlet} from '@angular/router';
import {provideAppIcons} from '@core/icons/app-icons.provider';
import {SettingsHubComponent} from './components/settings-hub/settings-hub.component';
import {SettingsComponent} from './settings.component';

@Component({
  template: '<router-outlet />',
  imports: [RouterOutlet],
})
class HostComponent {}

@Component({
  template: '<p>Sección de prueba</p>',
})
class StubSectionComponent {}

describe('SettingsComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let router: Router;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [HostComponent, SettingsComponent, SettingsHubComponent, StubSectionComponent],
      providers: [
        provideRouter([
          {
            path: 'settings',
            component: SettingsComponent,
            children: [
              {path: '', component: SettingsHubComponent},
              {path: 'theme', component: StubSectionComponent},
            ],
          },
        ]),
        provideAppIcons(),
      ],
    });
    await TestBed.compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('renders the hub and the desktop menu without a back button on the index route', async () => {
    await router.navigateByUrl('/settings');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('app-settings-hub')).not.toBeNull();
    expect(element.querySelector('app-settings-nav')).not.toBeNull();
    expect(element.querySelector('[aria-label="Volver a Ajustes"]')).toBeNull();
  });

  it('renders the back button inline with the section title on detail routes', async () => {
    await router.navigateByUrl('/settings/theme');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const backButton = element.querySelector<HTMLButtonElement>(
      'button[aria-label="Volver a Ajustes"]',
    );
    const headerRow = backButton?.parentElement;

    expect(element.querySelector('app-settings-hub')).toBeNull();
    expect(backButton).not.toBeNull();
    expect(headerRow?.classList.contains('flex')).toBe(true);
    expect(headerRow?.classList.contains('items-center')).toBe(true);
    expect(headerRow?.classList.contains('md:hidden')).toBe(true);
    expect(headerRow?.querySelector('h2')?.textContent?.trim()).toBe('Apariencia');
  });

  it('pops the navigation history when a previous entry exists', async () => {
    await router.navigateByUrl('/settings/theme');
    fixture.detectChanges();
    globalThis.history.replaceState({navigationId: 2}, '');

    const location = TestBed.inject(Location);
    const backSpy = vi.spyOn(location, 'back').mockImplementation(() => {});
    const element = fixture.nativeElement as HTMLElement;

    element.querySelector<HTMLButtonElement>('button[aria-label="Volver a Ajustes"]')?.click();

    expect(backSpy).toHaveBeenCalled();
  });

  it('navigates to the hub when there is no history entry to pop', async () => {
    await router.navigateByUrl('/settings/theme');
    fixture.detectChanges();
    globalThis.history.replaceState({navigationId: 1}, '');

    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLButtonElement>('button[aria-label="Volver a Ajustes"]')?.click();

    await vi.waitFor(() => expect(router.url).toBe('/settings'));
  });
});
