/** `impact(after) − impact(before)`, accumulated into one delta per account (9.4). */
export const movementBalanceDelta = (
  before: Map<number, number>,
  after: Map<number, number>,
): Map<number, number> => {
  const deltas = new Map<number, number>();

  for (const [accountId, value] of before) {
    deltas.set(accountId, (deltas.get(accountId) ?? 0) - value);
  }
  for (const [accountId, value] of after) {
    deltas.set(accountId, (deltas.get(accountId) ?? 0) + value);
  }

  return deltas;
};
