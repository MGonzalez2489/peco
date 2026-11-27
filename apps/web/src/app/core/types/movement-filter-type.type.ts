import {MovementType} from './movement-type.type';

/** `'ALL'` is a UI sentinel; every other value comes from the shared enum. */
export type MovementFilterType = 'ALL' | MovementType;
