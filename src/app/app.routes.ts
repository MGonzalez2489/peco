import {Routes} from '@angular/router';

export const routes: Routes = [
  {path: '', redirectTo: 'dashboard', pathMatch: 'full'},
  {
    path: 'dashboard',
    title: 'Overview',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'movements',
    title: 'Movements',
    loadComponent: () =>
      import('./features/movements/movements.component').then((m) => m.MovementsComponent),
  },
  {
    path: 'categories',
    title: 'Categories',
    loadComponent: () =>
      import('./features/categories/categories.component').then((m) => m.CategoriesComponent),
  },
  {
    path: 'categories/:id',
    title: 'Category details',
    loadComponent: () =>
      import('./features/categories/detail/category-detail.component').then(
        (m) => m.CategoryDetailComponent,
      ),
  },
  {
    path: 'preferences',
    title: 'Preferences',
    loadComponent: () =>
      import('./features/preferences/preferences.component').then((m) => m.PreferencesComponent),
  },
  {path: '**', redirectTo: 'dashboard'},
];
