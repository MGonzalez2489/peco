/** Returned by controllers that need extra transport-level `meta` keys. */
export class EnvelopeResult<T, M extends object = object> {
  private constructor(
    readonly data: T,
    readonly meta: M,
  ) {}

  static withMeta<T, M extends object>(data: T, meta: M): EnvelopeResult<T, M> {
    return new EnvelopeResult(data, meta);
  }
}
