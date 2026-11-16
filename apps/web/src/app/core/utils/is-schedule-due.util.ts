export const isScheduleDue = (nextExecutionDate: string, today: string): boolean =>
  nextExecutionDate <= today;
