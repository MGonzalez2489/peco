export const formatLocalDate = (isoDate: string): string => {
  const [year, month, day] = isoDate.split('T')[0].split('-').map(Number);
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
};
