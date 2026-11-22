/** Request data needed to locate or create an idempotency row (D108). */
export interface IdempotencyExecutionRequest {
  userPublicId: string;
  key: string;
  endpoint: string;
  requestHash: string;
  correlationId: string;
}
