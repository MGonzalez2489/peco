/** Force UTC so host timezone settings cannot shift scheduled jobs or period boundaries. */
export const forceUtcTimezone = (): void => {
  process.env.TZ = 'UTC';
};
