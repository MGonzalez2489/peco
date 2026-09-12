import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    title: 'Resumen',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent,
      ),
  },
  {
    path: 'movimientos',
    title: 'Movimientos',
    loadComponent: () =>
      import('./features/movimientos/movimientos.component').then(
        (m) => m.MovimientosComponent,
      ),
  },
  {
    path: 'categorias',
    title: 'Categorías',
    loadComponent: () =>
      import('./features/categorias/categorias.component').then(
        (m) => m.CategoriasComponent,
      ),
  },
  {
    path: 'categorias/:id',
    title: 'Detalle de cuenta',
    loadComponent: () =>
      import('./features/categorias/detalle/categoria-detalle.component').then(
        (m) => m.CategoriaDetalleComponent,
      ),
  },
  {
    path: 'preferencias',
    title: 'Preferencias',
    loadComponent: () =>
      import('./features/preferencias/preferencias.component').then(
        (m) => m.PreferenciasComponent,
      ),
  },
  { path: '**', redirectTo: 'dashboard' },
];