/** MySQL advisory lock that serializes the nightly period-close run across instances (12). */
export const PERIOD_CLOSE_LOCK_NAME = 'peco:period-close';
