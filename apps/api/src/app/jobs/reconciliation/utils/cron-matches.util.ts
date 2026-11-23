const FIELD_LIMITS = [
  [0, 59],
  [0, 23],
  [1, 31],
  [1, 12],
  [0, 7],
] as const;

const parseField = (expression: string, min: number, max: number): Set<number> => {
  const values = new Set<number>();

  for (const part of expression.split(',')) {
    const [range, stepText] = part.split('/');
    const step = stepText === undefined ? 1 : Number(stepText);
    if (!Number.isInteger(step) || step <= 0) {
      return new Set<number>();
    }

    let start: number;
    let end: number;
    if (range === '*') {
      start = min;
      end = max;
    } else if (range?.includes('-')) {
      const [from, to] = range.split('-');
      start = Number(from);
      end = Number(to);
    } else {
      start = Number(range);
      end = stepText === undefined ? start : max;
    }

    if (!Number.isInteger(start) || !Number.isInteger(end) || start < min || end > max || end < start) {
      return new Set<number>();
    }

    for (let value = start; value <= end; value += step) {
      values.add(value);
    }
  }

  return values;
};

/** UTC five-field cron matcher: `*`, lists, ranges and steps on every field. */
export const cronMatches = (expression: string, date: Date): boolean => {
  const fields = expression.trim().split(/\s+/);
  if (fields.length !== 5) {
    return false;
  }

  const parsed = fields.map((field, index) => {
    const [min, max] = FIELD_LIMITS[index] as readonly [number, number];
    return parseField(field, min, max);
  });
  if (parsed.some((field) => field.size === 0)) {
    return false;
  }

  const [minutes, hours, monthDays, months, weekDays] = parsed as [
    Set<number>,
    Set<number>,
    Set<number>,
    Set<number>,
    Set<number>,
  ];
  if (
    !months.has(date.getUTCMonth() + 1) ||
    !hours.has(date.getUTCHours()) ||
    !minutes.has(date.getUTCMinutes())
  ) {
    return false;
  }

  const utcDay = date.getUTCDay();
  const matchesMonthDay = monthDays.has(date.getUTCDate());
  const matchesWeekDay = weekDays.has(utcDay) || (utcDay === 0 && weekDays.has(7));
  const monthDayRestricted = fields[2] !== '*';
  const weekDayRestricted = fields[4] !== '*';

  if (monthDayRestricted && weekDayRestricted) {
    return matchesMonthDay || matchesWeekDay;
  }
  if (monthDayRestricted) {
    return matchesMonthDay;
  }
  if (weekDayRestricted) {
    return matchesWeekDay;
  }
  return true;
};
