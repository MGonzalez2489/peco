/** Accepted range for `GET /periods`; the API owns all defaults (8.12/US-703). */
export interface ListPeriodsQuery {
  from?: string;
  to?: string;
}
