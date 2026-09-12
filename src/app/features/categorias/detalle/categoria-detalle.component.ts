import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { FINANCE_STORAGE } from '../../../core/services/finance-storage.interface';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';
import { ConfirmModalComponent } from '../../../shared/components/confirm-modal/confirm-modal.component';
import { CategoriaFormModalComponent } from '../componentes/categoria-form-modal.component';
import {
  Categoria,
  Movimiento,
  TIPO_MOVIMIENTO_PALETA,
  TIPO_MOVIMIENTO_LABEL,
  TipoMovimiento,
  formatearMoneda,
  impactoEliminacion,
} from '../../../core/models/finance.model';

@Component({
  selector: 'app-categoria-detalle',
  imports: [
    RouterLink,
    CurrencyPipe,
    DatePipe,
    StatCardComponent,
    ConfirmModalComponent,
    CategoriaFormModalComponent,
  ],
  template: `
    @if (categoria(); as categoria) {
      <section class="space-y-6">
        <div class="flex items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {{ categoria.nombre }}
            </h1>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
              <a routerLink="/categorias" class="inline-flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200">
                <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
                Categorías
              </a>
            </p>
          </div>

          <div class="flex shrink-0 gap-2">
            <button
              type="button"
              (click)="editarAbierto.set(true)"
              class="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                />
              </svg>
              <span class="hidden sm:inline">Editar cuenta</span>
            </button>
            <button
              type="button"
              (click)="categoriaAEliminar.set(categoria)"
              class="inline-flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                />
              </svg>
              <span class="hidden sm:inline">Eliminar</span>
            </button>
          </div>
        </div>

        <app-stat-card
          [titulo]="categoria.nombre"
          [monto]="categoria.saldoActual"
          [color]="categoria.color ?? 'indigo'"
          [meta]="categoria.metaObjetivo"
          [subtexto]="subtextoCategoria(categoria.metaObjetivo)"
        />

        <div>
          <h2 class="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Historial ({{ movimientosDeCategoria().length }})
          </h2>
          <ul class="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
            @for (movimiento of movimientosDeCategoria(); track movimiento.id) {
              <li class="flex items-center gap-3 p-4">
                <span
                  aria-hidden="true"
                  class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold {{ paletaDe(movimiento).chip }}"
                >
                  {{ inicialDe(movimiento) }}
                </span>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-medium text-slate-900 dark:text-white">
                    {{ etiquetaDe(movimiento) }}
                  </p>
                  <p class="truncate text-xs text-slate-500 dark:text-slate-400">
                    {{ tipoLabel(movimiento.tipo) }}
                    @if (movimiento.nota) {
                      · {{ movimiento.nota }}
                    }
                    · {{ movimiento.fecha | date: 'dd/MM/yyyy' }}
                  </p>
                </div>
                <div class="flex shrink-0 items-center gap-2">
                  <span class="text-sm font-semibold {{ paletaDe(movimiento).texto }}">
                    {{ signoDe(movimiento) }}{{ movimiento.monto | currency: 'USD' : 'symbol' : '1.2-2' }}
                  </span>
                  <button
                    type="button"
                    (click)="movimientoAEliminar.set(movimiento)"
                    class="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                    [attr.aria-label]="'Eliminar este movimiento'"
                  >
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                      />
                    </svg>
                  </button>
                </div>
              </li>
            } @empty {
              <li class="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                No hay movimientos asociados a esta cuenta.
              </li>
            }
          </ul>
        </div>
      </section>

      <app-categoria-form-modal
        [isOpen]="editarAbierto()"
        [categoria]="categoria"
        (cerrado)="editarAbierto.set(false)"
      />

      <app-confirm-modal
        [isOpen]="movimientoAEliminar() !== null"
        title="Eliminar movimiento"
        confirmLabel="Sí, eliminar"
        cancelLabel="Cancelar"
        (confirmed)="procederEliminarMovimiento()"
        (dismissed)="cancelarEliminarMovimiento()"
      >
        <p>{{ mensajeImpactoMovimiento() }}</p>
      </app-confirm-modal>

      <app-confirm-modal
        [isOpen]="categoriaAEliminar() !== null"
        title="Eliminar cuenta"
        confirmLabel="Eliminar cuenta"
        cancelLabel="Cancelar"
        (confirmed)="procederEliminarCuenta()"
        (dismissed)="cancelarEliminarCuenta()"
      >
        <p>{{ mensajeEliminarCuenta() }}</p>
        @if (categoriaAEliminar()?.saldoActual !== 0) {
          <div class="mt-4">
            <label for="cat-destino-traspaso" class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Cuenta destino para el traspaso
            </label>
            <select
              id="cat-destino-traspaso"
              (change)="destinoTraspaso.set($any($event.target).value)"
              class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              @for (otra of otrasCategorias(); track otra.id) {
                <option [value]="otra.id" [selected]="otra.id === destinoTraspaso()">
                  {{ otra.nombre }} ({{ formatearMoneda(otra.saldoActual) }})
                </option>
              }
            </select>
          </div>
        }
      </app-confirm-modal>
    } @else {
      <section class="py-16 text-center">
        <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Cuenta no encontrada</h1>
        <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
          <a routerLink="/categorias" class="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
            Volver a Categorías
          </a>
        </p>
      </section>
    }
  `,
})
export class CategoriaDetalleComponent {
  readonly storage = inject(FINANCE_STORAGE);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);

  readonly id = toSignal(this.ruta.paramMap.pipe(map((params) => params.get('id') ?? '')));

  readonly categoria = computed(() =>
    this.storage.categorias().find((categoria) => categoria.id === this.id()),
  );

  readonly editarAbierto = signal(false);

  readonly movimientoAEliminar = signal<Movimiento | null>(null);
  readonly categoriaAEliminar = signal<Categoria | null>(null);

  readonly destinoTraspaso = linkedSignal<Categoria | null, string>({
    source: this.categoriaAEliminar,
    computation: (categoria) => {
      if (!categoria || categoria.saldoActual === 0) return '';
      return this.otrasCategorias()[0]?.id ?? '';
    },
  });

  readonly otrasCategorias = computed(() =>
    this.storage.categorias().filter((categoria) => categoria.id !== this.id()),
  );

  readonly movimientosDeCategoria = computed(() =>
    [...this.storage.movimientos()]
      .filter(
        (movimiento) =>
          movimiento.categoriaId === this.id() ||
          movimiento.categoriaDestinoId === this.id(),
      )
      .sort((a, b) => b.fecha.localeCompare(a.fecha)),
  );

  readonly mensajeImpactoMovimiento = computed(() => {
    const movimiento = this.movimientoAEliminar();
    if (!movimiento) return '';
    return impactoEliminacion(
      movimiento,
      this.nombreCategoria(movimiento.categoriaId),
      movimiento.categoriaDestinoId
        ? this.nombreCategoria(movimiento.categoriaDestinoId)
        : undefined,
    );
  });

  readonly mensajeEliminarCuenta = computed(() => {
    const categoria = this.categoriaAEliminar();
    if (!categoria) return '';
    if (categoria.saldoActual === 0) {
      return `La cuenta "${categoria.nombre}" se eliminará junto con su historial. ¿Deseas continuar?`;
    }
    return `La cuenta "${categoria.nombre}" tiene un saldo de ${formatearMoneda(categoria.saldoActual)}. Se creará una transferencia automática y luego se eliminará.`;
  });

  readonly subtextoCategoria = (metaObjetivo: number | undefined): string =>
    metaObjetivo !== undefined ? `Meta ${formatearMoneda(metaObjetivo)}` : 'Sin meta asignada';

  readonly formatearMoneda = formatearMoneda;

  readonly tipoLabel = (tipo: TipoMovimiento) => TIPO_MOVIMIENTO_LABEL[tipo];

  readonly nombreCategoria = (id: string): string =>
    this.storage
      .categorias()
      .find((categoria) => categoria.id === id)?.nombre ?? 'Sin categoría';

  readonly esDestino = (movimiento: Movimiento): boolean =>
    movimiento.tipo === 'TRANSFERENCIA' &&
    !!movimiento.categoriaDestinoId &&
    movimiento.categoriaDestinoId === this.id() &&
    movimiento.categoriaId !== this.id();

  readonly etiquetaDe = (movimiento: Movimiento): string =>
    movimiento.tipo === 'TRANSFERENCIA'
      ? `${this.nombreCategoria(movimiento.categoriaId)} → ${this.nombreCategoria(movimiento.categoriaDestinoId ?? '')}`
      : this.nombreCategoria(movimiento.categoriaId);

  readonly inicialDe = (movimiento: Movimiento): string =>
    this.nombreCategoria(
      this.esDestino(movimiento) ? movimiento.categoriaDestinoId! : movimiento.categoriaId,
    )
      .charAt(0)
      .toUpperCase();

  readonly signoDe = (movimiento: Movimiento): string => {
    if (this.esDestino(movimiento) || movimiento.tipo === 'INGRESO') return '+';
    return movimiento.tipo === 'EGRESO' ? '-' : '';
  };

  readonly paletaDe = (movimiento: Movimiento) =>
    this.esDestino(movimiento)
      ? TIPO_MOVIMIENTO_PALETA.INGRESO
      : TIPO_MOVIMIENTO_PALETA[movimiento.tipo];

  procederEliminarMovimiento(): void {
    const movimiento = this.movimientoAEliminar();
    if (movimiento) {
      this.storage.eliminarMovimiento(movimiento.id);
    }
    this.movimientoAEliminar.set(null);
  }

  cancelarEliminarMovimiento(): void {
    this.movimientoAEliminar.set(null);
  }

  procederEliminarCuenta(): void {
    const categoria = this.categoriaAEliminar();
    if (!categoria) return;

    if (categoria.saldoActual !== 0) {
      const destino = this.destinoTraspaso();
      if (!destino || destino === categoria.id) return;
      this.storage.eliminarCategoria(categoria.id, destino);
    } else {
      this.storage.eliminarCategoria(categoria.id);
    }

    this.categoriaAEliminar.set(null);
    void this.router.navigate(['/categorias']);
  }

  cancelarEliminarCuenta(): void {
    this.categoriaAEliminar.set(null);
  }
}