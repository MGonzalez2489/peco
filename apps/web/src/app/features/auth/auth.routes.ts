import {Routes} from '@angular/router';

/** Public authentication pages; route data marks them as chrome-free. */
export const authRoutes: Routes = [
  {
    path: 'login',
    title: 'Iniciar sesión',
    data: {public: true},
    loadComponent: () => import('./login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    title: 'Crear cuenta',
    data: {public: true},
    loadComponent: () => import('./register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'forgot-password',
    title: 'Recuperar contraseña',
    data: {public: true},
    loadComponent: () =>
      import('./forgot-password/forgot-password.component').then((m) => m.ForgotPasswordComponent),
  },
  {
    path: 'reset-password',
    title: 'Restablecer contraseña',
    data: {public: true},
    loadComponent: () =>
      import('./reset-password/reset-password.component').then((m) => m.ResetPasswordComponent),
  },
];
