import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FINANCE_STORAGE } from '../../core/services/finance-storage.interface';
import { ConfirmModalComponent } from '../../shared/components/confirm-modal/confirm-modal.component';
import {
  Movimiento,
  TipoMovimiento,
  TIPO_MOVIMIENTO_PALETA,
  TIPO_MOVIMIENTO_LABEL,
  impactoEliminacion,
} from '../../core/models/finance.model';

type FiltroMovimientos = 'TODOS' | TipoMovimiento;

@Component({
  selector: 'app-movimientos',
  imports: [CurrencyPipe, DatePipe, ConfirmModalComponent],
  template: `
    <section class="space-y-5">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Movimientos</h1>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {{ movimientosFiltrados().length }} movimiento{{ movimientosFiltrados().length === 1 ? '' : 's' }} registrado{{ movimientosFiltrados().length === 1 ? '' : 's' }}
        </p>
      </div>

      <div
        role="group"
        aria-label="Filtrar movimientos por tipo"
        class="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 dark:bg-slate-800"
      >
        @for (opcion of opcionesFiltro; track opcion.valor) {
          <button
            type="button"
            (click)="filtroTipo.set(opcion.valor)"
            [class]="
              filtroTipo() === opcion.valor
                ? 'flex-1 whitespace-nowrap rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                : 'flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            "
            [attr.aria-pressed]="filtroTipo() === opcion.valor"
          >
            {{ opcion.etiqueta }}
          </button>
        }
      </div>

      <div>
        <label for="filtro-categoria" class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Filtrar por meta / apartado
        </label>
        <select
          id="filtro-categoria"
          (change)="filtroCategoria.set($any($event.target).value)"
          class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:max-w-xs"
        >
          <option value="">Todas las metas</option>
          @for (categoria of categorias(); track categoria.id) {
            <option [value]="categoria.id" [selected]="categoria.id === filtroCategoria()">
              {{ categoria.nombre }}
            </option>
          }
        </select>
      </div>

      <ul
        class="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900"
      >
        @for (movimiento of movimientosFiltrados(); track movimiento.id) {
          <li class="flex items-center gap-3 p-4">
            <span
              aria-hidden="true"
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold {{ paletaMovimiento(movimiento.tipo).chip }}"
            >
              {{ inicialCategoria(movimiento.categoriaId) }}
            </span>

            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-slate-900 dark:text-white">
                {{ nombreCategoria(movimiento.categoriaId) }}
                @if (movimiento.tipo === 'TRANSFERENCIA' && movimiento.categoriaDestinoId) {
                  → {{ nombreCategoria(movimiento.categoriaDestinoId) }}
                }
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
              <span class="text-sm font-semibold {{ paletaMovimiento(movimiento.tipo).texto }}">
                {{ signoMovimiento(movimiento.tipo) }}{{ movimiento.monto | currency: 'USD' : 'symbol' : '1.2-2' }}
              </span>
              <button
                type="button"
                (click)="movimientoAEliminar.set(movimiento)"
                class="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                [attr.aria-label]="'Eliminar movimiento de ' + nombreCategoria(movimiento.categoriaId)"
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
            No hay movimientos con los filtros seleccionados.
          </li>
        }
      </ul>
    </section>

    <app-confirm-modal
      [isOpen]="movimientoAEliminar() !== null"
      title="Eliminar movimiento"
      confirmLabel="Sí, eliminar"
      cancelLabel="Cancelar"
      (confirmed)="procederEliminar()"
      (dismissed)="cancelarEliminar()"
    >
      <p><strong>Se revertirá este movimiento.</strong></p>
      <p class="mt-2">{{ mensajeImpacto() }}</p>
    </app-confirm-modal>
  `,
})
export class MovimientosComponent {
  readonly storage = inject(FINANCE_STORAGE);

  readonly categorias = this.storage.categorias;

  readonly filtroTipo = signal<FiltroMovimientos>('TODOS');
  readonly filtroCategoria = signal('');

  readonly movimientoAEliminar = signal<Movimiento | null>(null);

  readonly opcionesFiltro: Array<{ valor: FiltroMovimientos; etiqueta: string }> = [
    { valor: 'TODOS', etiqueta: 'Todos' },
    { valor: 'INGRESO', etiqueta: TIPO_MOVIMIENTO_LABEL.INGRESO },
    { valor: 'EGRESO', etiqueta: TIPO_MOVIMIENTO_LABEL.EGRESO },
    { valor: 'TRANSFERENCIA', etiqueta: TIPO_MOVIMIENTO_LABEL.TRANSFERENCIA },
  ];

  readonly movimientosFiltrados = computed(() => {
    const tipoFiltro = this.filtroTipo();
    const categoriaFiltro = this.filtroCategoria();

    return [...this.storage.movimientos()]
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
      .filter((movimiento) => {
        const coincideTipo =
          tipoFiltro === 'TODOS' || movimiento.tipo === tipoFiltro;
        const coincideCategoria =
          !categoriaFiltro ||
          movimiento.categoriaId === categoriaFiltro ||
          movimiento.categoriaDestinoId === categoriaFiltro;
        return coincideTipo && coincideCategoria;
      });
  });

  readonly mensajeImpacto = computed(() => {
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

  private readonly categoriasPorId = computed(
    () => new Map(this.categorias().map((categoria) => [categoria.id, categoria])),
  );

  readonly tipoLabel = (tipo: TipoMovimiento) => TIPO_MOVIMIENTO_LABEL[tipo];
  readonly signoMovimiento = (tipo: TipoMovimiento) => TIPO_MOVIMIENTO_PALETA[tipo].signo;
  readonly paletaMovimiento = (tipo: TipoMovimiento) => TIPO_MOVIMIENTO_PALETA[tipo];

  readonly nombreCategoria = (id: string): string =>
    this.categoriasPorId().get(id)?.nombre ?? 'Sin categoría';

  readonly inicialCategoria = (id: string): string =>
    this.categoriasPorId().get(id)?.nombre?.charAt(0).toUpperCase() ?? '?';

  procederEliminar(): void {
    const movimiento = this.movimientoAEliminar();
    if (movimiento) {
      this.storage.eliminarMovimiento(movimiento.id);
    }
    this.movimientoAEliminar.set(null);
  }

  cancelarEliminar(): void {
    this.movimientoAEliminar.set(null);
  }
}