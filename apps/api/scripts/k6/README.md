# API load scripts (US-1106)

These k6 scripts exercise the production HTTP pipeline against a running Pec API. They complement the deterministic E2E suite in `apps/api/src/app/testing/`: Jest verifies exact behavior and query plans, while k6 verifies the latency budgets under sustained concurrency.

## Prerequisites

- k6 installed locally (`brew install k6` on macOS, or the official Docker image).
- A migrated API instance with a seeded user and a representative dataset: 10k movements, 24 closed periods and roughly 50 accounts for the list/report scripts.
- Environment variables:

| Variable      | Default                     | Purpose                                      |
| ------------- | --------------------------- | -------------------------------------------- |
| `BASE_URL`    | `http://localhost:3000`     | API base URL                                 |
| `EMAIL`       | `load@example.com`          | Seeded user used by all scripts              |
| `PASSWORD`    | `correct-horse-battery`     | Password for that user                       |
| `DURATION`    | `2m` / `10m` for soak       | k6 scenario duration                         |
| `LIST_VUS`    | `10`                        | Concurrent list clients                      |
| `DASHBOARD_VUS` | `10`                      | Concurrent dashboard clients                 |
| `SOAK_VUS`    | `5`                         | Concurrent daily-job clients                 |
| `AS_OF`       | current UTC date            | Date-only boundary for the soak sweep        |

## Scripts

```bash
k6 run apps/api/scripts/k6/dashboard.js
k6 run apps/api/scripts/k6/movements-list.js
k6 run apps/api/scripts/k6/soak.js
```

Or through npm:

```bash
npm run test:load:dashboard
npm run test:load:list
npm run test:load:soak
```

### `dashboard.js`

Requests the 12-month dashboard report with tagged metrics and fails when p95 exceeds **500 ms** or the error rate reaches 0.5%.

### `movements-list.js`

Walks keyset pages over a 24-month window with 20 rows per page. It fails on repeated rows, p95 above **300 ms**, or an error rate of 0.5%. Cursors are kept per VU, so each iteration advances through the dataset instead of restarting from the first page.

### `soak.js`

Repeatedly calls the daily catch-up endpoint with a stable `Idempotency-Key` derived from `AS_OF`. The first request applies the due occurrences; the rest must be replays. The script counts replays and fails on unexpected statuses or errors.

For the memory half of US-1106, run the soak for at least 30 minutes and sample the process RSS (for example with `docker stats` or the container runtime metrics). A flat heap after warm-up and a cumulative `soak_replays` count with no additional writes satisfies the soak criterion. The deterministic E2E test `applies a concurrent duplicate-key burst exactly once` and the repeated-sweep test in `performance.e2e.spec.ts` assert the duplicate-write invariant exactly.

## Scope

- Login happens in `setup()`, so argon2 cost is not counted in endpoint thresholds.
- Scripts use the same envelope contract as the API: `{data, meta?, error}`.
- All script code and comments are written in English; API response copy remains Spanish.
