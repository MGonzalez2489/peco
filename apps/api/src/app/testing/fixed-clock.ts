import {UtcClock} from '../database/clock/utc-clock';

/** Deterministic `UtcClock` used by the fixed-clock rule of 14.1. */
export const fixedUtcClock = (iso: string): UtcClock => {
  const epoch = Date.parse(iso);
  if (!Number.isFinite(epoch)) {
    throw new Error(`Invalid fixed clock timestamp: ${iso}`);
  }

  return {
    now: (): string => new Date(epoch).toISOString(),
    plusSeconds: (seconds: number): string => new Date(epoch + seconds * 1000).toISOString(),
  } as UtcClock;
};
