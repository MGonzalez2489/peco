import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { FINANCE_STORAGE } from '../../../core/services/finance-storage.interface';
import { TipoMovimiento, TIPO_MOVIMIENTO_LABEL } from '../../../core/models/finance.model';

@Component({
  selector: 'app-movimiento-form-modal',
  imports: [ReactiveFormsModule, ModalComponent],
  template: `
    <app-modal [isOpen]="isOpen()" title="Nuevo movimiento" (closed)="cerrado.emit()">
      @if (categorias().length === 0) {
        <p class="mt-4 text-sm text-slate-500 dark:text-slate-400">
          Primero crea una categoría desde la sección Categorías.
        </p>
      } @else {
        <form [formGroup]="form" (ngSubmit)="guardar()" class="mt-5 space-y-4" novalidate>
          <div>
            <label for="mov-tipo" class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Tipo
            </label>
            <select
              id="mov-tipo"
              formControlName="tipo"
              class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              @for (opcion of opcionesTipo; track opcion.valor) {
                <option [value]="opcion.valor">{{ opcion.etiqueta }}</option>
              }
            </select>
          </div>

          <div>
            <label for="mov-monto" class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Monto
            </label>
            <input
              id="mov-monto"
              formControlName="monto"
              type="number"
              min="0.01"
              step="0.01"
              inputmode="decimal"
              placeholder="0.00"
              class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              [attr.aria-invalid]="form.controls.monto.touched && form.controls.monto.invalid"
            />
            @if (errorDe(form.controls.monto); as error) {
              <p class="mt-1 text-xs text-rose-600 dark:text-rose-400">{{ error }}</p>
            }
          </div>

          <div>
            <label for="mov-categoria" class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Categoría {{ tipoSeleccionado() === 'TRANSFERENCIA' ? 'origen' : '' }}
            </label>
            <select
              id="mov-categoria"
              formControlName="categoriaId"
              class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              [attr.aria-invalid]="form.controls.categoriaId.touched && form.controls.categoriaId.invalid"
            >
              <option value="" disabled>Selecciona una categoría</option>
              @for (categoria of categorias(); track categoria.id) {
                <option [value]="categoria.id">{{ categoria.nombre }}</option>
              }
            </select>
            @if (errorDe(form.controls.categoriaId); as error) {
              <p class="mt-1 text-xs text-rose-600 dark:text-rose-400">{{ error }}</p>
            }
          </div>

          @if (tipoSeleccionado() === 'TRANSFERENCIA') {
            <div>
              <label for="mov-destino" class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Categoría destino
              </label>
              <select
                id="mov-destino"
                formControlName="categoriaDestinoId"
                class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                [attr.aria-invalid]="form.controls.categoriaDestinoId.touched && form.controls.categoriaDestinoId.invalid"
              >
                <option value="" disabled>Selecciona la categoría destino</option>
                @for (categoria of categoriasDestino(); track categoria.id) {
                  <option [value]="categoria.id">{{ categoria.nombre }}</option>
                }
              </select>
              @if (errorDe(form.controls.categoriaDestinoId); as error) {
                <p class="mt-1 text-xs text-rose-600 dark:text-rose-400">{{ error }}</p>
              }
            </div>
          }

          <div>
            <label for="mov-nota" class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Nota <span class="font-normal text-slate-400 dark:text-slate-500">(opcional)</span>
            </label>
            <input
              id="mov-nota"
              formControlName="nota"
              type="text"
              autocomplete="off"
              placeholder="P. ej. Nómina de mayo"
              class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

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
              Guardar
            </button>
          </div>
        </form>
      }
    </app-modal>
  `,
})
export class MovimientoFormModalComponent {
  readonly isOpen = input(false);

  readonly cerrado = output<void>();

  readonly storage = inject(FINANCE_STORAGE);

  readonly categorias = this.storage.categorias;

  private readonly fb = inject(FormBuilder);

  protected readonly form = this.fb.group({
    monto: this.fb.control<number | null>(null, {
      validators: [Validators.required, Validators.min(0.01)],
    }),
    tipo: this.fb.control<TipoMovimiento>('EGRESO', Validators.required),
    categoriaId: this.fb.control<string>('', Validators.required),
    categoriaDestinoId: this.fb.control<string | null>(null),
    nota: this.fb.control<string>(''),
  });

  readonly tipoSeleccionado = signal<TipoMovimiento>('EGRESO');
  readonly categoriaOrigenId = signal('');

  readonly categoriasDestino = computed(() =>
    this.categorias().filter((categoria) => categoria.id !== this.categoriaOrigenId()),
  );

  readonly opcionesTipo: Array<{ valor: TipoMovimiento; etiqueta: string }> = [
    { valor: 'INGRESO', etiqueta: TIPO_MOVIMIENTO_LABEL.INGRESO },
    { valor: 'EGRESO', etiqueta: TIPO_MOVIMIENTO_LABEL.EGRESO },
    { valor: 'TRANSFERENCIA', etiqueta: TIPO_MOVIMIENTO_LABEL.TRANSFERENCIA },
  ];

  constructor() {
    const controlTipo = this.form.controls.tipo;
    const controlOrigen = this.form.controls.categoriaId;
    const controlDestino = this.form.controls.categoriaDestinoId;

    controlTipo.valueChanges.pipe(takeUntilDestroyed()).subscribe((tipo) => {
      const valor = tipo ?? 'EGRESO';
      this.tipoSeleccionado.set(valor);
      this.sincronizarDestino(valor);
    });

    controlOrigen.valueChanges.pipe(takeUntilDestroyed()).subscribe((origen) => {
      this.categoriaOrigenId.set(origen ?? '');
      if (controlTipo.value === 'TRANSFERENCIA' && origen && controlDestino.value === origen) {
        controlDestino.setValue(this.categorias().find((c) => c.id !== origen)?.id ?? '');
      }
    });

    effect(() => {
      if (this.isOpen()) {
        this.form.reset({
          monto: null,
          tipo: 'EGRESO',
          categoriaId: '',
          categoriaDestinoId: null,
          nota: '',
        });
        this.tipoSeleccionado.set('EGRESO');
        this.categoriaOrigenId.set('');
        const primera = this.categorias()[0];
        if (primera) controlOrigen.setValue(primera.id);
        this.sincronizarDestino('EGRESO');
      }
    });

    effect(() => {
      const disponibles = this.categorias();
      const actual = controlOrigen.value;
      if (actual && disponibles.some((c) => c.id === actual)) return;
      const primera = disponibles[0];
      if (primera) controlOrigen.setValue(primera.id);
    });
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const raw = this.form.getRawValue();
    const destinoId =
      raw.tipo === 'TRANSFERENCIA' ? raw.categoriaDestinoId ?? null : undefined;
    if (raw.tipo === 'TRANSFERENCIA' && (!destinoId || destinoId === raw.categoriaId)) return;

    this.storage.registrarMovimiento({
      categoriaId: raw.categoriaId ?? '',
      tipo: raw.tipo ?? 'EGRESO',
      monto: raw.monto ?? 0,
      nota: raw.nota?.trim() || undefined,
      categoriaDestinoId: destinoId ?? undefined,
    });

    this.cerrado.emit();
  }

  errorDe<T>(campo: FormControl<T>): string | null {
    if (!campo.touched || !campo.errors) return null;
    if (campo.hasError('required')) return 'Este campo es obligatorio.';
    if (campo.hasError('min')) return `El valor mínimo es ${campo.getError('min').min}.`;
    return 'Valor inválido.';
  }

  private sincronizarDestino(tipo: TipoMovimiento): void {
    const destino = this.form.controls.categoriaDestinoId;
    if (tipo === 'TRANSFERENCIA') {
      destino.enable();
      destino.setValidators(Validators.required);
    } else {
      destino.disable();
      destino.setValue(null);
      destino.clearValidators();
    }
    destino.updateValueAndValidity();
  }
}