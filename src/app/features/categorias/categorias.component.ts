import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { FINANCE_STORAGE } from '../../core/services/finance-storage.interface';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import {
  CATEGORIA_COLORS,
  ColorCategoria,
  formatearMoneda,
} from '../../core/models/finance.model';

@Component({
  selector: 'app-categorias',
  imports: [ReactiveFormsModule, StatCardComponent],
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
          <app-stat-card
            [titulo]="categoria.nombre"
            [monto]="categoria.saldoActual"
            [color]="categoria.color ?? 'indigo'"
            [meta]="categoria.metaObjetivo"
            [subtexto]="subtextoCategoria(categoria.metaObjetivo)"
          />
        }

        <button
          type="button"
          (click)="mostrarFormulario.set(!mostrarFormulario())"
          class="flex min-h-32 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 text-slate-500 transition hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-indigo-500 dark:hover:text-indigo-400"
          [attr.aria-expanded]="mostrarFormulario()"
        >
          <span class="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </span>
          <span class="text-sm font-semibold">Nuevo apartado</span>
        </button>
      </div>

      @if (mostrarFormulario()) {
        <form
          [formGroup]="form"
          (ngSubmit)="guardar()"
          class="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          novalidate
        >
          <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Nuevo apartado
          </h2>

          <div>
            <label for="cat-nombre" class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Nombre
            </label>
            <input
              id="cat-nombre"
              formControlName="nombre"
              type="text"
              autocomplete="off"
              placeholder="P. ej. Vacaciones"
              class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              [attr.aria-invalid]="form.controls.nombre.touched && form.controls.nombre.invalid"
            />
            @if (errorDe(form.controls.nombre); as error) {
              <p class="mt-1 text-xs text-rose-600 dark:text-rose-400">{{ error }}</p>
            }
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label for="cat-saldo" class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Saldo inicial
              </label>
              <input
                id="cat-saldo"
                formControlName="saldoInicial"
                type="number"
                min="0"
                step="0.01"
                inputmode="decimal"
                placeholder="0.00"
                class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                [attr.aria-invalid]="form.controls.saldoInicial.touched && form.controls.saldoInicial.invalid"
              />
              @if (errorDe(form.controls.saldoInicial); as error) {
                <p class="mt-1 text-xs text-rose-600 dark:text-rose-400">{{ error }}</p>
              }
            </div>

            <div>
              <label for="cat-meta" class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Meta <span class="font-normal text-slate-400 dark:text-slate-500">(opcional)</span>
              </label>
              <input
                id="cat-meta"
                formControlName="metaObjetivo"
                type="number"
                min="0"
                step="0.01"
                inputmode="decimal"
                placeholder="0.00"
                class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                [attr.aria-invalid]="form.controls.metaObjetivo.touched && form.controls.metaObjetivo.invalid"
              />
              @if (errorDe(form.controls.metaObjetivo); as error) {
                <p class="mt-1 text-xs text-rose-600 dark:text-rose-400">{{ error }}</p>
              }
            </div>
          </div>

          <fieldset>
            <legend class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Color</legend>
            <div class="flex flex-wrap gap-2">
              @for (opcion of opcionesColor; track opcion.clave) {
                <button
                  type="button"
                  (click)="form.controls.color.setValue(opcion.clave)"
                  class="flex h-9 w-9 items-center justify-center rounded-full transition"
                  [class]="
                    form.controls.color.value === opcion.clave
                      ? opcion.clases + ' ring-2 ring-slate-400/70 ring-offset-2 ring-offset-white dark:ring-offset-slate-900'
                      : opcion.clases
                  "
                  [attr.aria-pressed]="form.controls.color.value === opcion.clave"
                  [attr.aria-label]="'Usar color ' + opcion.clave"
                >
                  @if (form.controls.color.value === opcion.clave) {
                    <svg class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  }
                </button>
              }
            </div>
          </fieldset>

          <div class="flex justify-end gap-2 pt-1">
            <button
              type="button"
              (click)="mostrarFormulario.set(false)"
              class="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/30 transition hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
            >
              Crear apartado
            </button>
          </div>
        </form>
      }
    </section>
  `,
})
export class CategoriasComponent {
  readonly storage = inject(FINANCE_STORAGE);

  readonly categorias = this.storage.categorias;

  readonly mostrarFormulario = signal(false);

  private readonly fb = inject(FormBuilder);

  protected readonly form = this.fb.group({
    nombre: this.fb.control<string>('', Validators.required),
    saldoInicial: this.fb.control<number | null>(null, {
      validators: [Validators.required, Validators.min(0)],
    }),
    metaObjetivo: this.fb.control<number | null>(null, Validators.min(0)),
    color: this.fb.control<ColorCategoria>('indigo'),
  });

  readonly opcionesColor: Array<{ clave: ColorCategoria; clases: string }> = Object.entries(
    CATEGORIA_COLORS,
  ).map(([clave, paleta]) => ({ clave: clave as ColorCategoria, clases: paleta.chip }));

  readonly subtextoCategoria = (metaObjetivo: number | undefined): string =>
    metaObjetivo !== undefined ? `Meta ${formatearMoneda(metaObjetivo)}` : 'Sin meta asignada';

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const raw = this.form.getRawValue();
    this.storage.agregarCategoria({
      nombre: raw.nombre?.trim() ?? '',
      saldoInicial: raw.saldoInicial ?? 0,
      metaObjetivo: raw.metaObjetivo ?? undefined,
      color: raw.color ?? 'indigo',
    });

    this.form.reset({ nombre: '', saldoInicial: null, metaObjetivo: null, color: 'indigo' });
    this.mostrarFormulario.set(false);
  }

  errorDe<T>(campo: FormControl<T>): string | null {
    if (!campo.touched || !campo.errors) return null;
    if (campo.hasError('required')) return 'Este campo es obligatorio.';
    if (campo.hasError('min')) return `El valor mínimo es ${campo.getError('min').min}.`;
    return 'Valor inválido.';
  }
}