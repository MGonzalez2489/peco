export const formatLocalTime = (isoDate: string): string => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return '';

  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';

  const suffix = date.getHours() >= 12 ? 'PM' : 'AM';
  const hours = date.getHours() % 12 === 0 ? 12 : date.getHours() % 12;
  return `${String(hours).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')} ${suffix}`;
};
