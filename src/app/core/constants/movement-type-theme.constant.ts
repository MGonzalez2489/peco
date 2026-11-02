import {MovementType} from '../types/movement-type.type';

/**
 * WCAG 2.1 AA semantic palette for the movement type controls.
 *
 * Active buttons use the 700 shades with white text (contrast >= 4.5:1).
 *
 * Amount inputs follow the app-wide input pattern but keep a constant visual
 * weight: the 2px border never changes width and the soft 20% ring is always
 * rendered, so focusing only swaps the border color instead of making the
 * field look thicker. The focused border uses the 600 shades, which keep a
 * contrast ratio of at least 3:1 against the white surface.
 */
export const MOVEMENT_TYPE_THEME: Record<
  MovementType,
  {
    activeButtonClass: string;
    focusRingClass: string;
    inputTextClass: string;
    inputBorderClass: string;
    inputFocusClass: string;
  }
> = {
  INCOME: {
    activeButtonClass: 'bg-emerald-700 text-white shadow-sm',
    focusRingClass: 'focus-visible:ring-emerald-600 dark:focus-visible:ring-emerald-400',
    inputTextClass: 'text-emerald-700 dark:text-emerald-300',
    inputBorderClass:
      'border-emerald-400 ring-2 ring-emerald-600/20 dark:border-emerald-700 dark:ring-emerald-400/20',
    inputFocusClass: 'focus:border-emerald-600 dark:focus:border-emerald-400',
  },
  EXPENSE: {
    activeButtonClass: 'bg-rose-700 text-white shadow-sm',
    focusRingClass: 'focus-visible:ring-rose-600 dark:focus-visible:ring-rose-400',
    inputTextClass: 'text-rose-700 dark:text-rose-300',
    inputBorderClass:
      'border-rose-400 ring-2 ring-rose-600/20 dark:border-rose-700 dark:ring-rose-400/20',
    inputFocusClass: 'focus:border-rose-600 dark:focus:border-rose-400',
  },
  TRANSFER: {
    activeButtonClass: 'bg-indigo-700 text-white shadow-sm',
    focusRingClass: 'focus-visible:ring-indigo-600 dark:focus-visible:ring-indigo-400',
    inputTextClass: 'text-indigo-700 dark:text-indigo-300',
    inputBorderClass:
      'border-indigo-400 ring-2 ring-indigo-600/20 dark:border-indigo-700 dark:ring-indigo-400/20',
    inputFocusClass: 'focus:border-indigo-600 dark:focus:border-indigo-400',
  },
};
