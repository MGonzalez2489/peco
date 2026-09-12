import { InjectionToken, Signal, inject } from '@angular/core';
import {
  Categoria,
  CrearCategoriaDTO,
  CrearMovimientoDTO,
  Movimiento,
} from '../models/finance.model';
import { LocalFinanceService } from './local-finance.service';

export interface IFinanceStorage {
  readonly categorias: Signal<readonly Categoria[]>;
  readonly movimientos: Signal<readonly Movimiento[]>;
  readonly saldoTotal: Signal<number>;

  agregarCategoria(dto: CrearCategoriaDTO): void;
  actualizarCategoria(id: string, dto: CrearCategoriaDTO): void;
  eliminarCategoria(id: string, categoriaDestinoId?: string): void;
  registrarMovimiento(dto: CrearMovimientoDTO): void;
  eliminarMovimiento(id: string): void;
}

export const FINANCE_STORAGE = new InjectionToken<IFinanceStorage>('FINANCE_STORAGE', {
  providedIn: 'root',
  factory: () => inject(LocalFinanceService),
});