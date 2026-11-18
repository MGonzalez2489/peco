const SENSITIVE_KEY_PATTERN = /(password|token|secret|authorization|cookie|credential|apikey)/i;
const REDACTED = '[REDACTED]';

/** Removes credentials and secrets from structured log payloads. */
export function redactSensitiveFields(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (seen.has(value)) {
    return '[Circular]';
  }

  seen.add(value);

  if (Array.isArray(value)) {
    const redacted = value.map((item) => redactSensitiveFields(item, seen));
    seen.delete(value);
    return redacted;
  }

  const redacted = Object.fromEntries(
    Object.entries(value).map(([key, nested]) => [
      key,
      SENSITIVE_KEY_PATTERN.test(key) ? REDACTED : redactSensitiveFields(nested, seen),
    ]),
  );
  seen.delete(value);
  return redacted;
}
