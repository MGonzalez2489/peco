import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FINANCE_STORAGE } from '../../core/services/finance-storage.interface';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { CategoriaFormModalComponent } from './componentes/categoria-form-modal.component';
import { formatearMoneda } from '../../core/models/finance.model';

@Component({
  selector: 'app-categorias',
  imports: [RouterLink, StatCardComponent, CategoriaFormModalComponent],
  template: `
    <section class="space-y-6">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Categorías</h1>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Apartados con saldo y meta para organizar tu dinero.
        </p>
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        @for (categoria of categorias(); track categoria.id) {
          <a
            [routerLink]="['/categorias', categoria.id]"
            class="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
            [attr.aria-label]="'Ver detalle de ' + categoria.nombre"
          >
            <app-stat-card
              [titulo]="categoria.nombre"
              [monto]="categoria.saldoActual"
              [color]="categoria.color ?? 'indigo'"
              [meta]="categoria.metaObjetivo"
              [subtexto]="subtextoCategoria(categoria.metaObjetivo)"
            />
          </a>
        }

        <button
          type="button"
          (click)="modalAbierto.set(true)"
          class="flex min-h-32 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 text-slate-500 transition hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-indigo-500 dark:hover:text-indigo-400"
        >
          <span class="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </span>
          <span class="text-sm font-semibold">Nuevo apartado</span>
        </button>
      </div>
    </section>

    <app-categoria-form-modal
      [isOpen]="modalAbierto()"
      [categoria]="null"
      (cerrado)="modalAbierto.set(false)"
    />
  `,
})
export class CategoriasComponent {
  readonly storage = inject(FINANCE_STORAGE);

  readonly categorias = this.storage.categorias;

  readonly modalAbierto = signal(false);

  readonly subtextoCategoria = (metaObjetivo: number | undefined): string =>
    metaObjetivo !== undefined ? `Meta ${formatearMoneda(metaObjetivo)}` : 'Sin meta asignada';
}