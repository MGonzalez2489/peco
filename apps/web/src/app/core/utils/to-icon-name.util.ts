import {ALLOWED_ICONS} from '../icons/app-icons.provider';
import {IconName} from '@shared/components/app-icon/app-icon.component';

const resolvedNames = new Map<string, IconName>();

export function toIconName(value: string | undefined, fallback: IconName): IconName {
  if (!value) return fallback;

  const cached = resolvedNames.get(value);
  if (cached) return cached;

  const pascalKey = value.replace(
    /(^|-)([a-z0-9])/g,
    (_match, _separator: string, letter: string) => letter.toUpperCase(),
  );

  const resolved = Object.prototype.hasOwnProperty.call(ALLOWED_ICONS, pascalKey)
    ? (value as IconName)
    : fallback;

  resolvedNames.set(value, resolved);
  return resolved;
}
