import { Injectable, computed, effect, signal } from '@angular/core';
import {
  Categoria,
  CrearCategoriaDTO,
  CrearMovimientoDTO,
  Movimiento,
  formatearMoneda,
} from '../models/finance.model';
import { IFinanceStorage } from './finance-storage.interface';

const STORAGE_KEY_CATEGORIAS = 'peco.categorias';
const STORAGE_KEY_MOVIMIENTOS = 'peco.movimientos';

@Injectable({ providedIn: 'root' })
export class LocalFinanceService implements IFinanceStorage {
  private readonly categoriasSignal = signal<Categoria[]>([]);
  private readonly movimientosSignal = signal<Movimiento[]>([]);

  readonly categorias = this.categoriasSignal.asReadonly();
  readonly movimientos = this.movimientosSignal.asReadonly();

  readonly saldoTotal = computed(() =>
    this.categorias().reduce((total, categoria) => total + categoria.saldoActual, 0),
  );

  constructor() {
    const semilla = crearDatosSemilla();
    this.categoriasSignal.set(
      this.leerPersistido(STORAGE_KEY_CATEGORIAS, semilla.categorias),
    );
    this.movimientosSignal.set(
      this.leerPersistido(STORAGE_KEY_MOVIMIENTOS, semilla.movimientos),
    );

    effect(() => {
      localStorage.setItem(STORAGE_KEY_CATEGORIAS, JSON.stringify(this.categorias()));
      localStorage.setItem(STORAGE_KEY_MOVIMIENTOS, JSON.stringify(this.movimientos()));
    });
  }

  agregarCategoria(dto: CrearCategoriaDTO): void {
    const categoria: Categoria = {
      id: crypto.randomUUID(),
      nombre: dto.nombre.trim(),
      saldoActual: dto.saldoInicial,
      metaObjetivo: dto.metaObjetivo,
      color: dto.color,
      icono: dto.icono,
    };
    this.categoriasSignal.update((actuales) => [...actuales, categoria]);
  }

  actualizarCategoria(id: string, dto: CrearCategoriaDTO): void {
    this.categoriasSignal.update((actuales) =>
      actuales.map((categoria) =>
        categoria.id === id
          ? {
              ...categoria,
              nombre: dto.nombre.trim(),
              metaObjetivo: dto.metaObjetivo,
              color: dto.color,
              icono: dto.icono ?? categoria.icono,
            }
          : categoria,
      ),
    );
  }

  eliminarCategoria(id: string, categoriaDestinoId?: string): void {
    const categoria = this.categorias().find((c) => c.id === id);
    if (!categoria) return;

    if (categoria.saldoActual !== 0 && categoriaDestinoId && categoriaDestinoId !== id) {
      const monto = categoria.saldoActual;
      this.registrarMovimiento({
        categoriaId: id,
        tipo: 'TRANSFERENCIA',
        monto,
        categoriaDestinoId,
        nota: `Eliminación de cuenta ${categoria.nombre} traspaso ${formatearMoneda(monto)}`,
      });
    }

    this.categoriasSignal.update((actuales) => actuales.filter((c) => c.id !== id));
  }

  registrarMovimiento(dto: CrearMovimientoDTO): void {
    const movimiento: Movimiento = {
      id: crypto.randomUUID(),
      fecha: dto.fecha ?? new Date().toISOString(),
      categoriaId: dto.categoriaId,
      tipo: dto.tipo,
      monto: dto.monto,
      nota: dto.nota,
      categoriaDestinoId: dto.categoriaDestinoId,
    };

    this.movimientosSignal.update((actuales) => [movimiento, ...actuales]);
    this.aplicarMovimiento(movimiento, 1);
  }

  eliminarMovimiento(id: string): void {
    const movimiento = this.movimientos().find((m) => m.id === id);
    if (!movimiento) return;

    this.movimientosSignal.update((actuales) => actuales.filter((m) => m.id !== id));
    this.aplicarMovimiento(movimiento, -1);
  }

  private aplicarMovimiento(movimiento: Movimiento, sentido: 1 | -1): void {
    this.categoriasSignal.update((actuales) =>
      actuales.map((categoria) => {
        let saldo = categoria.saldoActual;

        if (categoria.id === movimiento.categoriaId) {
          const deltaOrigen =
            movimiento.tipo === 'INGRESO' ? movimiento.monto : -movimiento.monto;
          saldo += sentido * deltaOrigen;
        }

        if (
          movimiento.tipo === 'TRANSFERENCIA' &&
          movimiento.categoriaDestinoId &&
          categoria.id === movimiento.categoriaDestinoId
        ) {
          saldo += sentido * movimiento.monto;
        }

        return saldo === categoria.saldoActual
          ? categoria
          : { ...categoria, saldoActual: saldo };
      }),
    );
  }

  private leerPersistido<T>(clave: string, respaldo: T[]): T[] {
    try {
      const crudo = localStorage.getItem(clave);
      if (!crudo) return respaldo;
      const datos = JSON.parse(crudo) as unknown;
      return Array.isArray(datos) ? (datos as T[]) : respaldo;
    } catch {
      return respaldo;
    }
  }
}

function crearDatosSemilla(): { categorias: Categoria[]; movimientos: Movimiento[] } {
  const haceDias = (dias: number): string =>
    new Date(Date.now() - dias * 86_400_000).toISOString();

  const categorias: Categoria[] = [
    {
      id: 'c-efectivo',
      nombre: 'Efectivo',
      saldoActual: 430,
      metaObjetivo: 1000,
      color: 'emerald',
      icono: 'wallet',
    },
    {
      id: 'c-ahorro',
      nombre: 'Ahorro',
      saldoActual: 1700,
      metaObjetivo: 5000,
      color: 'violet',
      icono: 'ahorro',
    },
    {
      id: 'c-inversion',
      nombre: 'Inversión',
      saldoActual: 800,
      color: 'amber',
      icono: 'inversion',
    },
  ];

  const movimientos: Movimiento[] = [
    {
      id: 'm-1',
      categoriaId: 'c-efectivo',
      tipo: 'INGRESO',
      monto: 2000,
      fecha: haceDias(6),
      nota: 'Nómina',
    },
    {
      id: 'm-2',
      categoriaId: 'c-efectivo',
      tipo: 'EGRESO',
      monto: 550,
      fecha: haceDias(5),
      nota: 'Mercado',
    },
    {
      id: 'm-3',
      categoriaId: 'c-efectivo',
      tipo: 'EGRESO',
      monto: 320,
      fecha: haceDias(3),
      nota: 'Restaurante',
    },
    {
      id: 'm-4',
      categoriaId: 'c-ahorro',
      tipo: 'INGRESO',
      monto: 1000,
      fecha: haceDias(4),
      nota: 'Bonificación',
    },
    {
      id: 'm-5',
      categoriaId: 'c-efectivo',
      tipo: 'TRANSFERENCIA',
      monto: 700,
      fecha: haceDias(2),
      categoriaDestinoId: 'c-ahorro',
      nota: 'Ahorro automático',
    },
    {
      id: 'm-6',
      categoriaId: 'c-inversion',
      tipo: 'INGRESO',
      monto: 800,
      fecha: haceDias(1),
      nota: 'Dividendos',
    },
  ];

  return { categorias, movimientos };
}