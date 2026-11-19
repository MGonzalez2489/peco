/** Union of every literal wire value in a string-enum registry. */
export type StringEnumValues<T extends Record<string, {toString(): string}>> = ReturnType<
  T[keyof T]['toString']
>;
