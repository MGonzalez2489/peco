/** MySQL advisory lock that serializes the nightly auto-apply run across instances (12). */
export const AUTO_APPLY_LOCK_NAME = 'peco:auto-apply';
