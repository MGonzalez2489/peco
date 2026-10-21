import {AccountType} from '../types/account-type.type';

/**
 * Tailwind tones used to render each account type. Every tone keeps a WCAG AA
 * contrast ratio (>= 4.5:1) against the card background in light and dark
 * themes, so the account type labels stay readable at compact sizes.
 */
export const ACCOUNT_TYPE_PALETTE: Record<
  AccountType,
  {label: string; chip: string}
> = {
  CASH: {
    label: 'text-emerald-700 dark:text-emerald-400',
    chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  },
  DEBIT: {
    label: 'text-sky-700 dark:text-sky-400',
    chip: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400',
  },
  CREDIT: {
    label: 'text-rose-700 dark:text-rose-400',
    chip: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400',
  },
  SAVINGS: {
    label: 'text-amber-700 dark:text-amber-400',
    chip: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  },
};
