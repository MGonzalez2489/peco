import {Routes} from '@angular/router';

export const routes: Routes = [
  {path: '', redirectTo: 'dashboard', pathMatch: 'full'},
  {
    path: 'dashboard',
    title: 'Resumen',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'movements',
    title: 'Movimientos',
    loadComponent: () =>
      import('./features/movements/movements.component').then((m) => m.MovementsComponent),
  },
  {
    path: 'categories',
    title: 'Categorías',
    loadComponent: () =>
      import('./features/categories/categories.component').then((m) => m.CategoriesComponent),
  },
  {
    path: 'categories/:id',
    title: 'Detalle de cuenta',
    loadComponent: () =>
      import('./features/categories/detail/category-detail.component').then(
        (m) => m.CategoryDetailComponent,
      ),
  },
  {
    path: 'preferences',
    title: 'Preferencias',
    loadComponent: () =>
      import('./features/preferences/preferences.component').then((m) => m.PreferencesComponent),
  },
  {
    path: 'logs',
    title: 'Registro de cambios',
    loadComponent: () => import('./features/logs/logs.component').then((m) => m.LogsComponent),
  },
  {path: '**', redirectTo: 'dashboard'},
];
