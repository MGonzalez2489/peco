/**
 * Builds one member of a string enum. `toString()` keeps the literal type, so
 * `Enum.MEMBER.toString()` stays assignable to the derived contract types
 * instead of widening to `string`.
 */
export const stringEnumValue = <T extends string>(value: T) => ({
  value,
  toString: (): T => value,
});
