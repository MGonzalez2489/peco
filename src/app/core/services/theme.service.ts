import {Injectable, computed, effect, signal} from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'peco.theme';

@Injectable({providedIn: 'root'})
export class ThemeService {
  readonly themeMode = signal<ThemeMode>(this.readSavedPreference());

  private readonly media = window.matchMedia('(prefers-color-scheme: dark)');

  private readonly systemDark = signal(this.media.matches);

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

    effect(() => {
      document.documentElement.classList.toggle('dark', this.isDark());
    });

    effect(() => {
      localStorage.setItem(THEME_STORAGE_KEY, this.themeMode());
    });
  }

  setThemeMode(mode: ThemeMode): void {
    this.themeMode.set(mode);
  }

  private readSavedPreference(): ThemeMode {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';
  }
}
