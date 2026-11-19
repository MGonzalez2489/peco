/** Literal wire value of one string-enum member. */
export type StringEnumValue<T extends {toString(): string}> = ReturnType<T['toString']>;
