/** Header and pending-row limits for persisted idempotency (8.5, M12, D108). */
export const IDEMPOTENCY_LIMITS = {
  minKeyLength: 8,
  maxKeyLength: 128,
  pendingResponseStatus: 0,
  maxEndpointLength: 200,
} as const;
