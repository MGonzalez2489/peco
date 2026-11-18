const DURATION_PATTERN = /^(\d+)(s|m|h|d)$/;

const SECONDS_PER_UNIT: Readonly<Record<string, number>> = {
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
};

/** Converts a config duration such as `15m` into the seconds reported to clients. */
export const durationToSeconds = (duration: string): number => {
  const match = DURATION_PATTERN.exec(duration);

  if (
    !match ||
    Number(match[1]) <= 0 ||
    match[2] === undefined ||
    SECONDS_PER_UNIT[match[2]] === undefined
  ) {
    throw new Error(`Invalid duration: "${duration}"`);
  }

  return Number(match[1]) * SECONDS_PER_UNIT[match[2]];
};
