import {AccountColor} from '../types/account-color.type';

export const ACCOUNT_COLORS: Record<
  AccountColor,
  {text: string; textDark: string; chip: string; bar: string}
> = {
  indigo: {
    text: '#4F46E5',
    textDark: '#818CF8',
    chip: '#6366F1',
    bar: '#6366F1',
  },
  emerald: {
    text: '#059669',
    textDark: '#34D399',
    chip: '#10B981',
    bar: '#10B981',
  },
  amber: {
    text: '#D97706',
    textDark: '#FBBF24',
    chip: '#F59E0B',
    bar: '#F59E0B',
  },
  rose: {
    text: '#E11D48',
    textDark: '#FB7185',
    chip: '#F43F5E',
    bar: '#F43F5E',
  },
  violet: {
    text: '#7C3AED',
    textDark: '#A78BFA',
    chip: '#8B5CF6',
    bar: '#8B5CF6',
  },
  sky: {
    text: '#0284C7',
    textDark: '#38BDF8',
    chip: '#0EA5E9',
    bar: '#0EA5E9',
  },
};
