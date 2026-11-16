import {SettingsSection} from '../models/settings-section.model';

export const SETTINGS_SECTIONS: readonly SettingsSection[] = [
  {
    path: 'theme',
    title: 'Preferencias',
    description: 'Tema y preferencias del dispositivo',
    icon: 'palette',
    categoryGroup: 'Preferencias',
  },
  {
    path: 'categories',
    title: 'Categorías',
    description: 'Gestionar íconos y colores',
    icon: 'tag',
    categoryGroup: 'Preferencias',
  },
  {
    path: 'data',
    title: 'Datos y copias',
    description: 'Exportar e importar respaldos JSON',
    icon: 'save',
    categoryGroup: 'Datos y seguridad',
  },
  {
    path: 'changelog',
    title: 'Novedades y cambios',
    description: 'Historial de versiones y notas',
    icon: 'file-text',
    categoryGroup: 'Información',
  },
];
