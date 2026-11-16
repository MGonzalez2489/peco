export const writeStorageArray = <T>(key: string, value: T[]): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    return;
  }
};
