import {Routes} from '@angular/router';
import {SettingsComponent} from './settings.component';

export const settingsRoutes: Routes = [
  {
    path: '',
    component: SettingsComponent,
    children: [
      {path: '', redirectTo: 'theme', pathMatch: 'full'},
      {path: 'appearance', redirectTo: 'theme', pathMatch: 'full'},
      {path: 'data-backup', redirectTo: 'data', pathMatch: 'full'},
      {
        path: 'theme',
        title: 'Apariencia',
        loadComponent: () =>
          import('./components/theme-settings/theme-settings.component').then(
            (m) => m.ThemeSettingsComponent,
          ),
      },
      {
        path: 'categories',
        title: 'Categorías',
        loadComponent: () =>
          import('./components/categories-settings/categories-settings.component').then(
            (m) => m.CategoriesSettingsComponent,
          ),
      },
      {
        path: 'data',
        title: 'Datos y copias',
        loadComponent: () =>
          import('./components/data-settings/data-settings.component').then(
            (m) => m.DataSettingsComponent,
          ),
      },
      {
        path: 'changelog',
        title: 'Novedades y cambios',
        loadComponent: () =>
          import('./components/changelog-settings/changelog-settings.component').then(
            (m) => m.ChangelogSettingsComponent,
          ),
      },
    ],
  },
];
