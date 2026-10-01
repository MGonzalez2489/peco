import {NavigationItem} from '../models/navigation-item.model';

export const NAVIGATION_ITEMS: readonly NavigationItem[] = [
  {label: 'Inicio', route: '/dashboard', icon: 'home'},
  {label: 'Movimientos', route: '/movements', icon: 'movements'},
  {label: 'Cuentas', route: '/accounts', icon: 'accounts'},
  {label: 'Programados', route: '/scheduled', icon: 'scheduled'},
  {label: 'Ajustes', route: '/preferences', icon: 'settings'},
  {label: 'Cambios', route: '/logs', icon: 'logs'},
];
