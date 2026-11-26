# API operations runbook (EP-10)

This is the operational companion to `docs/backend/plan.md` (sections 12, 13.2 and
13.4). It covers the artefacts implemented by US-1001–US-1004; the full release
runbook (restore drill, OpenAPI publication, secret rotation checklist) remains
US-1204.

## Scraping `/metrics`

`GET /metrics` returns Prometheus text (`text/plain; version=0.0.4`) outside the
`/api` prefix. It is allowed from loopback, RFC1918 ranges and IPv6 local
addresses; outside those ranges it requires `X-Metrics-Token` with the value of
`METRICS_TOKEN` (at least 16 characters, checked with a constant-time compare).
A public caller without the token receives `403 FORBIDDEN`.

```bash
curl -sS http://localhost:3000/metrics
curl -sS -H "X-Metrics-Token: $METRICS_TOKEN" https://api.example.com/metrics
```

The registry is in memory and per instance. Scrape every replica and aggregate
with `sum`/`avg` as shown below; counters reset when a process restarts, so use
`rate`/`increase` rather than raw totals.

## Metrics, queries and dashboard panels

One PromQL query and one dashboard panel per metric. All names come from
`MetricNameEnum` in `@peco/enums`; label values are bounded (no user identifiers).

| Metric                          | Type / labels                          | PromQL query                                                                                               | Dashboard panel                          |
| ------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `http_request_duration_seconds` | histogram, `method`, `route`, `status` | `histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket[5m])))`                   | HTTP p95 latency (seconds), 5 min window |
| `http_requests_total`           | counter, `method`, `route`, `status`   | `sum(rate(http_requests_total{status=~"5.."}[5m])) / clamp_min(sum(rate(http_requests_total[5m])), 0.001)` | 5xx error rate, 5 min window             |
| `job_run_duration_seconds`      | histogram, `job`, `status`             | `histogram_quantile(0.95, sum by (job, le) (rate(job_run_duration_seconds_bucket[5m])))`                   | Job p95 duration by `job`                |
| `job_processed_users_total`     | counter, `job`                         | `sum by (job) (increase(job_processed_users_total[24h]))`                                                  | Users processed per job, 24 h            |
| `occurrences_applied_total`     | counter                                | `sum(increase(occurrences_applied_total[1h]))`                                                             | Applied occurrences per hour             |
| `occurrences_skipped_total`     | counter                                | `sum(increase(occurrences_skipped_total[1h]))`                                                             | Skipped occurrences per hour             |
| `occurrences_failed_total`      | counter                                | `sum(increase(occurrences_failed_total[1h]))`                                                              | Failed occurrences per hour              |
| `periods_closed_total`          | counter                                | `sum(increase(periods_closed_total[24h]))`                                                                 | Periods closed, 24 h                     |
| `reconciliation_drift_total`    | counter                                | `sum(increase(reconciliation_drift_total[24h]))`                                                           | Reconciliation drift, 24 h               |
| `snapshot_chain_mismatch_total` | counter                                | `sum(increase(snapshot_chain_mismatch_total[24h]))`                                                        | Snapshot chain mismatches, 24 h          |
| `db_pool_in_use`                | gauge, per instance                    | `avg(db_pool_in_use) / 10` (replace `10` with `DATABASE_POOL_SIZE`)                                        | DB pool utilisation ratio                |

Suggested dashboard: one row for HTTP traffic (panels 1–2), one row for jobs
(panels 3–8), one row for integrity and capacity (panels 9–11). Add a job-status
panel using `sum by (job, status) (increase(job_run_duration_seconds_count[24h]))`
to distinguish `SUCCESS`, `SKIPPED` and `FAILED` runs.

## Jobs, schedules and locks

| Job                    | Default cron (`UTC`) | Lock key (`JobKeyEnum`) | Advisory lock           | Failure signal                                                   |
| ---------------------- | -------------------- | ----------------------- | ----------------------- | ---------------------------------------------------------------- |
| Auto-apply             | `5 0 * * *`          | `AUTO_APPLY`            | `peco:auto-apply`       | No `SUCCESS` run in 26 h; rising `occurrences_failed_total`      |
| Period closing         | `10 0 * * *`         | `PERIOD_CLOSE`          | `peco:period-close`     | No `SUCCESS` run in 26 h; rising `snapshot_chain_mismatch_total` |
| Balance reconciliation | `0 3 * * *`          | `RECONCILIATION`        | `peco:reconciliation`   | No `SUCCESS` run in 26 h; `reconciliation_drift_total > 0`       |
| Retention cleanup      | `0 4 * * *`          | `CLEANUP`               | none (durable row only) | No `SUCCESS` run in 26 h; log line `Cleanup failed`              |

Each run takes a `jobLocks` row for its key inside `JOB_LOCK_TTL_SECONDS`
(default 300), then executes inside the advisory lock when one exists. A second
instance skips with a `SKIPPED` metric and a `... skipped: another instance holds
the run lock` log; this is expected and is not a failure. A row older than its
TTL is reclaimed automatically. Unique keys in the schema remain the real guard
against double work.

## Alerts

The app emits `ALERT` log lines (with `correlationId`, `jobKey` and allowlisted
dimensions) only for the two integrity rules it detects. All other rules are
evaluated by the platform from `/metrics` and the log stream; delivery is owned
by the platform (D71), not by the API.

| Rule                      | Severity | Source                                                                     |
| ------------------------- | -------- | -------------------------------------------------------------------------- |
| `RECONCILIATION_DRIFT`    | page     | Structured `ALERT` line and `reconciliation_drift_total`                   |
| `SNAPSHOT_CHAIN_MISMATCH` | page     | Structured `ALERT` line and `snapshot_chain_mismatch_total`                |
| `JOB_STALE`               | page     | `job_run_duration_seconds_count{status="SUCCESS"}` absent for 26 h per job |
| `HTTP_5XX_RATE`           | page     | 5xx error rate panel above 1% over 5 min                                   |
| `HTTP_P95`                | warn     | HTTP p95 panel above 600 ms over 10 min                                    |
| `DB_POOL_SATURATION`      | warn     | DB pool ratio above 0.8 over 5 min                                         |

## Procedures

### Investigate a skipped or stale job

1. Filter logs by `jobKey` and `correlationId`; confirm whether the line says the
   run was skipped because another instance held the lock. A `SKIPPED` line is
   normal when several replicas tick in the same minute.
2. Check the dashboard's job-status panel and `job_run_duration_seconds_count`
   for the key. If no `SUCCESS` appears within 26 h, raise `JOB_STALE`.
3. Inspect the lock row:

   ```sql
   SELECT `jobKey`, `lockToken`, `expiresAt`, `updatedAt` FROM `jobLocks` WHERE `jobKey` = 'CLEANUP';
   ```

   A row with an `expiresAt` in the past is reclaimable by the next run; no
   manual delete is needed. Only if the token belongs to a process known to be
   dead and the TTL was misconfigured, delete that single row by both `jobKey`
   and `lockToken`. Never delete all lock rows: that can start two runs at once.

### Retention cleanup

`CleanupService` deletes in `CLEANUP_BATCH_SIZE` batches (default 1000), so a
longer run is expected after an outage. It removes `idempotencyKeys` with
`expiresAt <= now`, `refreshTokens` that are revoked or expired, and `auditLogs`
older than `AUDIT_LOG_RETENTION_DAYS` (minimum 730). A second run must report
zero removals; if it does not, inspect the predicates before changing the cron.

### Rotate `METRICS_TOKEN`

Set a new value of at least 16 characters in the platform secret store, restart
the instances, then update the scraper's `X-Metrics-Token` header. The old token
stops working immediately after restart; a stale scraper shows `403 FORBIDDEN`.

### Dependency audit

CI runs `npm audit --audit-level=critical`. A failure blocks the merge: upgrade
the affected dependency in the lockfile, rerun the audit and the affected Nx
targets, and record any unavoidable exception in the decision log rather than
disabling the check.

### Security boundaries

Security headers (including HSTS in production), strict CORS and the 1 MB JSON
body limit are applied before any route. Do not widen `CORS_ORIGINS` to `*`, do
not disable the header middleware, and keep `/metrics` off the public ingress
unless the token is configured. Request logs never contain `userId`, bodies or
credentials; alert dimensions are allowlisted, so do not add identifiers to
them.
