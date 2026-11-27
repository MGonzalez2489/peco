import type {ApiListSuccess} from '@peco/contracts';

/** Envelope data and transport meta after the single unwrapping step. */
export type ApiListResult<T, M extends object = object> = Omit<ApiListSuccess<T, M>, 'error'>;
