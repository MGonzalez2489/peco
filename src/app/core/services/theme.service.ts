import {Injectable, computed, inject, signal} from '@angular/core';
import {UserPreferencesStore} from '../stores/user-preferences.store';
import {AppTheme} from '../types/app-theme.type';

@Injectable({providedIn: 'root'})
export class ThemeService {
  private readonly store = inject(UserPreferencesStore);

  private readonly media = window.matchMedia('(prefers-color-scheme: dark)');

  private readonly systemDark = signal(this.media.matches);

  readonly themeMode = computed(() => this.store.theme());

  readonly isDark = computed(() => {
    switch (this.themeMode()) {
      case 'light':
        return false;
      case 'dark':
        return true;
      default:
        return this.systemDark();
    }
  });

  constructor() {
    this.media.addEventListener('change', (event) => {
      this.systemDark.set(event.matches);
    });
  }

  setThemeMode(mode: AppTheme): void {
    this.store.setTheme(mode);
  }
}
