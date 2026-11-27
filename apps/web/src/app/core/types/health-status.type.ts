/** Flat, non-enveloped connectivity probe owned by the API. */
export interface HealthStatus {
  status: string;
  uptime: number;
  db: string;
}
