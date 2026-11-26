const SENSITIVE_KEY_PATTERN =
  /(password|token|secret|authorization|cookie|credential|apikey|userid|publicid|email|stack)/i;
const SENSITIVE_EXACT_KEYS = new Set(['ip', 'ipAddress', 'to', 'from']);
const REDACTED = '[REDACTED]';

const isSensitiveKey = (key: string): boolean =>
  SENSITIVE_KEY_PATTERN.test(key) || SENSITIVE_EXACT_KEYS.has(key);

/** Removes credentials, secrets and direct identifiers from structured log payloads. */
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
      isSensitiveKey(key) ? REDACTED : redactSensitiveFields(nested, seen),
    ]),
  );
  seen.delete(value);
  return redacted;
}
