import { Injectable, computed, effect, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'peco.theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly themeMode = signal<ThemeMode>(this.leerPreferenciaGuardada());

  private readonly media = window.matchMedia('(prefers-color-scheme: dark)');

  private readonly sistemaOscuro = signal(this.media.matches);

  readonly esOscuro = computed(() => {
    switch (this.themeMode()) {
      case 'light':
        return false;
      case 'dark':
        return true;
      default:
        return this.sistemaOscuro();
    }
  });

  constructor() {
    this.media.addEventListener('change', (evento) => {
      this.sistemaOscuro.set(evento.matches);
    });

    effect(() => {
      document.documentElement.classList.toggle('dark', this.esOscuro());
    });

    effect(() => {
      localStorage.setItem(THEME_STORAGE_KEY, this.themeMode());
    });
  }

  setThemeMode(modo: ThemeMode): void {
    this.themeMode.set(modo);
  }

  private leerPreferenciaGuardada(): ThemeMode {
    const guardado = localStorage.getItem(THEME_STORAGE_KEY);
    return guardado === 'light' || guardado === 'dark' || guardado === 'system'
      ? guardado
      : 'system';
  }
}