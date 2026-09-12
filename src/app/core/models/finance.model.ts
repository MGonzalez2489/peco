export type TipoMovimiento = 'INGRESO' | 'EGRESO' | 'TRANSFERENCIA';

export interface Categoria {
  id: string;
  nombre: string;
  saldoActual: number;
  metaObjetivo?: number;
  color?: string;
  icono?: string;
}

export interface Movimiento {
  id: string;
  categoriaId: string;
  tipo: TipoMovimiento;
  monto: number;
  fecha: string;
  nota?: string;
  categoriaDestinoId?: string;
}

export interface CrearCategoriaDTO {
  nombre: string;
  saldoInicial: number;
  metaObjetivo?: number;
  color?: string;
  icono?: string;
}

export interface CrearMovimientoDTO {
  categoriaId: string;
  tipo: TipoMovimiento;
  monto: number;
  fecha?: string;
  nota?: string;
  categoriaDestinoId?: string;
}

export const TIPO_MOVIMIENTO_LABEL: Record<TipoMovimiento, string> = {
  INGRESO: 'Ingreso',
  EGRESO: 'Egreso',
  TRANSFERENCIA: 'Transferencia',
};

export const CATEGORIA_COLORS = {
  indigo: { text: 'text-indigo-600 dark:text-indigo-400', chip: 'bg-indigo-500', bar: 'bg-indigo-500' },
  emerald: { text: 'text-emerald-600 dark:text-emerald-400', chip: 'bg-emerald-500', bar: 'bg-emerald-500' },
  amber: { text: 'text-amber-600 dark:text-amber-400', chip: 'bg-amber-500', bar: 'bg-amber-500' },
  rose: { text: 'text-rose-600 dark:text-rose-400', chip: 'bg-rose-500', bar: 'bg-rose-500' },
  violet: { text: 'text-violet-600 dark:text-violet-400', chip: 'bg-violet-500', bar: 'bg-violet-500' },
  sky: { text: 'text-sky-600 dark:text-sky-400', chip: 'bg-sky-500', bar: 'bg-sky-500' },
} as const;

export type ColorCategoria = keyof typeof CATEGORIA_COLORS;

export function colorDeCategoria(color?: string): { text: string; chip: string; bar: string } {
  return CATEGORIA_COLORS[(color ?? 'indigo') as ColorCategoria] ?? CATEGORIA_COLORS.indigo;
}

export const TIPO_MOVIMIENTO_PALETA: Record<
  TipoMovimiento,
  { texto: string; chip: string; signo: string }
> = {
  INGRESO: {
    texto: 'text-emerald-600 dark:text-emerald-400',
    chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
    signo: '+',
  },
  EGRESO: {
    texto: 'text-rose-600 dark:text-rose-400',
    chip: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400',
    signo: '-',
  },
  TRANSFERENCIA: {
    texto: 'text-sky-600 dark:text-sky-400',
    chip: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400',
    signo: '',
  },
};

export const formatearMoneda = (valor: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(valor);