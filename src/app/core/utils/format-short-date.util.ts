const SHORT_MONTHS = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

export const formatShortDate = (isoDate: string): string => {
  const [, month, day] = isoDate.split('T')[0].split('-').map(Number);
  const monthLabel = SHORT_MONTHS[month - 1] ?? '';
  return `${String(day).padStart(2, '0')} ${monthLabel}`;
};
