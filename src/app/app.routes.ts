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
  { path: '**', redirectTo: 'dashboard' },
];