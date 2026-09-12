import { Component, computed, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FINANCE_STORAGE } from '../../core/services/finance-storage.interface';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import {
  Categoria,
  TipoMovimiento,
  TIPO_MOVIMIENTO_PALETA,
  TIPO_MOVIMIENTO_LABEL,
  formatearMoneda,
} from '../../core/models/finance.model';

@Component({
  selector: 'app-dashboard',
  imports: [StatCardComponent, CurrencyPipe, DatePipe],
  template: `
    <section class="space-y-6">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Resumen</h1>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Así van tus finanzas hoy.</p>
      </div>

      <app-stat-card
        titulo="Saldo total"
        [monto]="saldoTotal()"
        color="indigo"
        subtexto="Suma de todos tus apartados"
      />

      <div>
        <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Apartados
        </h2>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          @for (categoria of categorias(); track categoria.id) {
            <app-stat-card
              [titulo]="categoria.nombre"
              [monto]="categoria.saldoActual"
              [color]="categoria.color ?? 'indigo'"
              [meta]="categoria.metaObjetivo"
              [subtexto]="subtextoCategoria(categoria)"
            />
          } @empty {
            <p class="col-span-full text-sm text-slate-500 dark:text-slate-400">
              Aún no hay apartados. Crea el primero desde la sección Categorías.
            </p>
          }
        </div>
      </div>

      <div>
        <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Actividad reciente
        </h2>
        <ul class="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          @for (movimiento of movimientosRecientes(); track movimiento.id) {
            <li class="flex items-center gap-3 p-4">
              <span aria-hidden="true" class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold {{ paletaMovimiento(movimiento.tipo).chip }}">
                {{ inicialCategoria(movimiento.categoriaId) }}
              </span>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-slate-900 dark:text-white">
                  {{ nombreCategoria(movimiento.categoriaId) }}
                </p>
                <p class="truncate text-xs text-slate-500 dark:text-slate-400">
                  {{ tipoLabel(movimiento.tipo) }}
                  @if (movimiento.nota) {
                    · {{ movimiento.nota }}
                  }
                </p>
              </div>
              <div class="shrink-0 text-right">
                <p class="text-sm font-semibold {{ paletaMovimiento(movimiento.tipo).texto }}">
                  {{ signoMovimiento(movimiento.tipo) }}{{ movimiento.monto | currency: 'USD' : 'symbol' : '1.2-2' }}
                </p>
                <p class="text-xs text-slate-400 dark:text-slate-500">
                  {{ movimiento.fecha | date: 'dd/MM/yyyy' }}
                </p>
              </div>
            </li>
          } @empty {
            <li class="p-4 text-sm text-slate-500 dark:text-slate-400">Todavía no hay movimientos.</li>
          }
        </ul>
      </div>
    </section>
  `,
})
export class DashboardComponent {
  readonly storage = inject(FINANCE_STORAGE);

  readonly categorias = this.storage.categorias;
  readonly saldoTotal = this.storage.saldoTotal;

  readonly movimientosRecientes = computed(() =>
    [...this.storage.movimientos()]
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
      .slice(0, 5),
  );

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

  readonly subtextoCategoria = (categoria: Categoria): string =>
    categoria.metaObjetivo !== undefined
      ? `Meta ${formatearMoneda(categoria.metaObjetivo)}`
      : 'Sin meta asignada';
}