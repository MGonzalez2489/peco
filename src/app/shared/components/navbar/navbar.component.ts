import { Component, inject, output } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav
      class="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 md:inset-x-0 md:bottom-auto md:top-0 md:border-b md:border-t-0"
    >
      <div class="mx-auto flex max-w-5xl items-center px-2 md:px-4">
        <a routerLink="/dashboard" class="hidden items-center gap-2 py-4 pr-8 md:flex" aria-label="Peco — Inicio">
          <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
          </span>
          <span class="text-lg font-bold tracking-tight text-slate-900 dark:text-white">Peco</span>
        </a>

        <div class="grid flex-1 grid-cols-4 items-center md:grid-cols-3">
          @for (enlace of enlaces; track enlace.ruta) {
            <a
              [routerLink]="enlace.ruta"
              routerLinkActive="text-indigo-600 dark:text-indigo-400"
              [attr.aria-current]="esActivo(enlace.ruta) ? 'page' : null"
              class="flex flex-col items-center gap-1 px-2 py-2 text-[11px] font-medium text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white md:flex-row md:gap-2 md:py-4 md:text-sm"
            >
              @switch (enlace.icono) {
                @case ('inicio') {
                  <svg class="h-6 w-6 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" aria-hidden="true">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75"
                    />
                  </svg>
                }
                @case ('movimientos') {
                  <svg class="h-6 w-6 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" aria-hidden="true">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
                    />
                  </svg>
                }
                @case ('categorias') {
                  <svg class="h-6 w-6 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" aria-hidden="true">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z"
                    />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 6h.008v.008H6V6Z" />
                  </svg>
                }
              }
              <span>{{ enlace.etiqueta }}</span>
            </a>
          }

          <button
            type="button"
            (click)="capturar.emit()"
            class="-mt-6 flex h-14 w-14 items-center justify-center self-start rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 md:hidden"
            aria-label="Registrar movimiento rápido"
          >
            <svg class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke-width="2.2" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
        </div>

        <button
          type="button"
          (click)="capturar.emit()"
          class="ml-4 hidden items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/30 transition hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 md:inline-flex"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span>Registrar</span>
        </button>
      </div>
    </nav>
  `,
})
export class NavbarComponent {
  readonly capturar = output<void>();

  private readonly router = inject(Router);

  readonly enlaces = [
    { etiqueta: 'Inicio', ruta: '/dashboard', icono: 'inicio' },
    { etiqueta: 'Movimientos', ruta: '/movimientos', icono: 'movimientos' },
    { etiqueta: 'Categorías', ruta: '/categorias', icono: 'categorias' },
  ];

  private readonly rutaActual = toSignal(
    this.router.events.pipe(
      filter((evento): evento is NavigationEnd => evento instanceof NavigationEnd),
      map((evento) => evento.url),
      startWith(this.router.url),
    ),
  );

  esActivo(ruta: string): boolean {
    return this.rutaActual() === ruta;
  }
}