import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { MovimientoFormModalComponent } from './features/movimientos/componentes/movimiento-form-modal.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent, MovimientoFormModalComponent],
  template: `
    <a
      href="#contenido"
      class="absolute left-4 top-4 z-50 -translate-y-full rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition focus:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
    >
      Saltar al contenido
    </a>

    <div
      class="min-h-dvh bg-slate-50 text-slate-900 selection:bg-indigo-500/20 dark:bg-slate-950 dark:text-slate-100"
    >
      <app-navbar (capturar)="modalAbierto.set(true)" />

      <main
        id="contenido"
        tabindex="-1"
        class="mx-auto w-full max-w-5xl px-4 pb-24 pt-6 focus:outline-none md:pb-10 md:pt-20"
      >
        <router-outlet />
      </main>
    </div>

    <app-movimiento-form-modal
      [isOpen]="modalAbierto()"
      (cerrado)="modalAbierto.set(false)"
    />
  `,
})
export class AppComponent {
  readonly modalAbierto = signal(false);
}