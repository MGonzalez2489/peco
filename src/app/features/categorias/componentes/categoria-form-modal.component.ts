import { Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { FINANCE_STORAGE } from '../../../core/services/finance-storage.interface';
import {
  Categoria,
  CATEGORIA_COLORS,
  ColorCategoria,
  formatearMoneda,
} from '../../../core/models/finance.model';

@Component({
  selector: 'app-categoria-form-modal',
  imports: [ReactiveFormsModule, ModalComponent],
  template: `
    <app-modal
      [isOpen]="isOpen()"
      [title]="categoria() ? 'Editar cuenta' : 'Nueva categoría'"
      (closed)="cerrado.emit()"
    >
      <form [formGroup]="form" (ngSubmit)="guardar()" class="mt-5 space-y-4" novalidate>
        @if (categoria(); as editar) {
          <div
            class="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm dark:bg-slate-800/60"
          >
            <span class="text-slate-500 dark:text-slate-400">Saldo actual</span>
            <span class="font-semibold text-slate-900 dark:text-white">
              {{ formatearMoneda(editar.saldoActual) }}
            </span>
          </div>
        }

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

        @if (!categoria()) {
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
        }

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

        <div class="flex justify-end gap-2 pt-2">
          <button
            type="button"
            (click)="cerrado.emit()"
            class="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>
          <button
            type="submit"
            class="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/30 transition hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
          >
            {{ categoria() ? 'Guardar cambios' : 'Crear apartado' }}
          </button>
        </div>
      </form>
    </app-modal>
  `,
})
export class CategoriaFormModalComponent {
  readonly isOpen = input(false);
  readonly categoria = input<Categoria | null>(null);

  readonly cerrado = output<void>();
  readonly guardado = output<void>();

  readonly storage = inject(FINANCE_STORAGE);

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

  readonly formatearMoneda = formatearMoneda;

  constructor() {
    effect(() => {
      this.prepararFormulario();
    });
  }

  private prepararFormulario(): void {
    const editar = this.categoria();
    if (!this.isOpen()) return;

    const saldo = this.form.controls.saldoInicial;

    if (editar) {
      saldo.clearValidators();
      saldo.updateValueAndValidity();
      this.form.reset({
        nombre: editar.nombre,
        saldoInicial: null,
        metaObjetivo: editar.metaObjetivo ?? null,
        color: (editar.color as ColorCategoria) ?? 'indigo',
      });
    } else {
      saldo.setValidators([Validators.required, Validators.min(0)]);
      saldo.updateValueAndValidity();
      this.form.reset({
        nombre: '',
        saldoInicial: null,
        metaObjetivo: null,
        color: 'indigo',
      });
    }
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const raw = this.form.getRawValue();
    const editar = this.categoria();

    if (editar) {
      this.storage.actualizarCategoria(editar.id, {
        nombre: raw.nombre?.trim() ?? '',
        saldoInicial: editar.saldoActual,
        metaObjetivo: raw.metaObjetivo ?? undefined,
        color: raw.color ?? 'indigo',
      });
    } else {
      this.storage.agregarCategoria({
        nombre: raw.nombre?.trim() ?? '',
        saldoInicial: raw.saldoInicial ?? 0,
        metaObjetivo: raw.metaObjetivo ?? undefined,
        color: raw.color ?? 'indigo',
      });
    }

    this.guardado.emit();
    this.cerrado.emit();
  }

  errorDe<T>(campo: FormControl<T>): string | null {
    if (!campo.touched || !campo.errors) return null;
    if (campo.hasError('required')) return 'Este campo es obligatorio.';
    if (campo.hasError('min')) return `El valor mínimo es ${campo.getError('min').min}.`;
    return 'Valor inválido.';
  }
}