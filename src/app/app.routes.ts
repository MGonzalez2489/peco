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
    path: 'scheduled',
    title: 'Programados',
    loadComponent: () =>
      import('./features/scheduled/scheduled-transactions.component').then(
        (m) => m.ScheduledTransactionsComponent,
      ),
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
    path: 'settings',
    title: 'Ajustes',
    loadChildren: () => import('./features/settings/settings.routes').then((m) => m.settingsRoutes),
  },
  {path: 'preferences', redirectTo: 'settings/theme'},
  {path: 'logs', redirectTo: 'settings/changelog'},
  {path: '**', redirectTo: 'dashboard'},
];
