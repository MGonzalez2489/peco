import {Component, signal} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {MovimientoFormModalComponent} from '@features/movements/componentes';
import {NavbarComponent} from '@shared/components';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent, MovimientoFormModalComponent],
  template: `
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

    <app-movimiento-form-modal [isOpen]="modalAbierto()" (cerrado)="modalAbierto.set(false)" />
  `,
})
export class AppComponent {
  readonly modalAbierto = signal(false);
}
