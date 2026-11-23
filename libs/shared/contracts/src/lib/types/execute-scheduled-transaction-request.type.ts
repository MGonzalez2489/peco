/** Execute-one body; `actualAmount` overrides the estimate for this occurrence only (10.5/US-604). */
export interface ExecuteScheduledTransactionRequest {
  actualAmount?: number;
}
