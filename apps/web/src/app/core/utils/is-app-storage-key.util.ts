export const isAppStorageKey = (key: string): boolean =>
  key.startsWith('peco.') || key.startsWith('peco_');
