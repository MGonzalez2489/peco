export const pickRandom = <T>(items: readonly T[]): T | undefined =>
  items.length > 0 ? items[Math.floor(Math.random() * items.length)] : undefined;
