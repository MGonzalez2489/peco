const HEX_BODY = /^#?([0-9a-f]{6})$/i;

export const toSoftCategoryColor = (hex: string, alpha = '26'): string => {
  const match = HEX_BODY.exec(hex.trim());
  if (!match) return `rgba(107, 114, 128, 0.15)`;

  return `#${match[1]}${alpha}`;
};
