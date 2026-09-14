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
    path: 'accounts',
    title: 'Cuentas',
    loadComponent: () =>
      import('./features/accounts/accounts.component').then((m) => m.AccountsComponent),
  },
  {
    path: 'accounts/:id',
    title: 'Detalle de cuenta',
    loadComponent: () =>
      import('./features/accounts/detail/account-detail.component').then(
        (m) => m.AccountDetailComponent,
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
