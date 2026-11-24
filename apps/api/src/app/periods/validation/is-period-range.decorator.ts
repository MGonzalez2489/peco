import {ValidateBy, type ValidationArguments, type ValidationOptions} from 'class-validator';
import {MAX_PERIOD_RANGE_MONTHS} from '../constants/max-period-range-months.constant';
import {periodRangeMonthCount} from '../utils/period-range-month-count.util';

/** The explicit `from`/`to` pair stays ordered and spans at most 24 months (8.12). */
export const IsPeriodRange = (options?: ValidationOptions): PropertyDecorator =>
  ValidateBy(
    {
      name: 'periodRange',
      validator: {
        validate: (value: unknown, args?: ValidationArguments): boolean => {
          if (typeof value !== 'string' || value.length === 0) {
            return true;
          }
          const query = args?.object as {from?: unknown} | undefined;
          if (typeof query?.from !== 'string' || query.from.length === 0) {
            return true;
          }

          const months = periodRangeMonthCount(query.from, value);
          return months > 0 && months <= MAX_PERIOD_RANGE_MONTHS;
        },
        defaultMessage: (): string =>
          `from and to must be ordered YYYY-MM periods within ${MAX_PERIOD_RANGE_MONTHS} months`,
      },
    },
    options,
  );
