import { Component, computed, input } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { colorDeCategoria } from '../../../core/models/finance.model';

@Component({
  selector: 'app-stat-card',
  imports: [CurrencyPipe],
  template: `
    <div
      class="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
    >
      <div class="flex items-center justify-between gap-2">
        <p class="truncate text-sm font-medium text-slate-500 dark:text-slate-400">
          {{ titulo() }}
        </p>
        <span aria-hidden="true" class="h-2.5 w-2.5 shrink-0 rounded-full {{ paleta().chip }}"></span>
      </div>

      <p class="mt-2 text-2xl font-bold tracking-tight {{ paleta().text }}">
        {{ monto() | currency: 'USD' : 'symbol' : '1.2-2' }}
      </p>

      @if (subtexto(); as texto) {
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">{{ texto }}</p>
      }

      @if (meta(); as objetivo) {
        <div class="mt-4" [attr.aria-label]="'Progreso hacia la meta de ' + titulo()">
          <div class="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Meta</span>
            <span>{{ porcentajeMeta() }}%</span>
          </div>
          <div class="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div class="h-full rounded-full transition-all {{ paleta().bar }}" [style.width.%]="porcentajeMeta()"></div>
          </div>
        </div>
      }
    </div>
  `,
})
export class StatCardComponent {
  readonly titulo = input<string>('');
  readonly monto = input<number>(0);
  readonly color = input<string>('indigo');
  readonly meta = input<number | undefined>();
  readonly subtexto = input<string | undefined>();

  readonly paleta = computed(() => colorDeCategoria(this.color()));

  readonly porcentajeMeta = computed(() => {
    const meta = this.meta();
    const monto = this.monto();
    if (meta === undefined || meta <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round((monto / meta) * 100)));
  });
}