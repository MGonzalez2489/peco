# Web → Backend API Integration Plan

## 0. Document control

| Field           | Value                                                                                                    |
| --------------- | -------------------------------------------------------------------------------------------------------- |
| Status          | Draft — phase 2 frontend migration plan                                                                  |
| Source of truth | `docs/backend/plan.md` v1.75, limited to items explicitly marked done, implemented, complete or verified |
| Target app      | `apps/web` (Angular 22 standalone PWA, Nx project `web`)                                                 |
| Backend app     | `apps/api` (NestJS 11, Nx project `api`)                                                                 |
| Shared code     | `@peco/contracts`, `@peco/enums`, `@peco/utils`                                                          |
| UI language     | Spanish user-facing copy; all code, identifiers and documentation in English                             |
| Last updated    | 2026-11-26                                                                                               |

This document describes the work required in `apps/web` to consume the backend
that is already implemented. It is a migration plan, not an implementation log.
No backend behavior is proposed here: every API rule referenced below comes from
a completed item of `docs/backend/plan.md`.

## 1. Scope and source constraints

### 1.1 Completed backend capabilities in scope

The backend plan marks the following work as done, implemented, complete or
verified. These are the only backend capabilities this UI plan may rely on:

- **EP-01 Foundation & platform:** US-100, US-101, US-102, US-103, US-104,
  US-105.
- **EP-02 Authentication & users:** US-201, US-202, US-203, US-204, US-205,
  US-206, US-207, US-208, US-209.
- **EP-03 Accounts:** US-301, US-302, US-303, US-304, US-305, US-306.
- **EP-04 Categories:** US-401, US-402. US-403 is deliberately skipped.
- **EP-05 Ledger & movements:** US-501–US-511; see the exact status table in
  section 2.
- **EP-06 Scheduled transactions:** US-601–US-608.
- **EP-07 Periods & snapshots:** US-701–US-706.
- **EP-08 Reports:** US-801–US-806.
- **EP-09 Preferences:** US-901, US-902.
- **EP-10 Operations & security:** US-1001–US-1004.
- **EP-11 Test & quality gates:** US-1101–US-1106.

### 1.2 Explicit non-goals

The following are explicitly out of scope in the backend plan and must not be
reintroduced by the frontend migration:

- No `localStorage` business-data migration. Q15 decides that existing users
  start from zero; no legacy importer is added.
- No backup/import/reset feature. D20 removes it from the frontend because the
  database replaces device sync. This is distinct from the completed
  `GET /api/users/me/export` data-export endpoint.
- No real offline-first synchronization, local mutation queue, delta sync or
  conflict resolution. D72 keeps the PWA shell cached but requires connectivity
  for data; no API response is cached. When offline, the UI must show an explicit
  offline state and no balances.
- No changelog, theme or PWA-service-worker backend. These remain client-side.
- No category delete/reassign UI until US-403 is implemented.
- No release-readiness work from EP-12 is assumed complete.

### 1.3 Architectural constraints carried over from the completed Nx migration

- `apps/web` and `apps/api` are separate Nx projects. An app must never import
  another app.
- `libs/shared/*` is framework-agnostic. The web app may import
  `@peco/contracts`, `@peco/enums` and `@peco/utils`; it must not import NestJS.
- Domain value sets come only from `@peco/enums`. Wire types come from
  `@peco/contracts`. The web app maps contracts into its own `core/models`
  according to `AGENTS.md`.
- Nx commands remain: `nx serve web`, `nx serve api`, `nx build web`,
  `nx test web`, `nx affected -t lint test build`.
- Local ports from the repository configuration: web `http://localhost:8080`,
  API `http://localhost:3000`, API prefix `/api`, health at `/health`, docs at
  `/docs` and `/docs-json`. `CORS_ORIGINS` defaults to
  `http://localhost:8080`.

## 2. Completed backend status inventory

The UI migration must align with the exact completion states below.

| Epic  | Stories with completed status in the plan                                                                                                                                                  | Notes                                                                                                                                 |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| EP-01 | US-100 ✅ Done, US-101 ✅ Done, US-102 ✅ Done, US-103 ✅ Done, US-104 ✅ Done, US-105 ✅ Done                                                                                             | Nx workspace, scaffold/config, typed config, schema, error envelope, OpenAPI, logging and limits.                                     |
| EP-02 | US-201 ✅ Done, US-202 ✅ Done, US-203 ✅ Done, US-204 ✅ Done, US-205 ✅ Done, US-206 ✅ Done, US-207 ✅ Done, US-208 ✅ Done, US-209 ✅ Done                                             | Registration, login, refresh rotation, logout, password reset, guards/throttling/activity, profile, password change and data export.  |
| EP-03 | US-301 ✅ Done, US-302 ✅ Done, US-303 ✅ Done, US-304 ✅ Done, US-305 ✅ Done, US-306 ✅ Done                                                                                             | Account reads, create, update, pin, delete-with-transfer and root invariant.                                                          |
| EP-04 | US-401 ✅ Done, US-402 ✅ Done                                                                                                                                                             | Category list plus create/update. US-403 is deliberately skipped.                                                                     |
| EP-05 | US-501 ✅ Done, US-502 ✅ Done, US-503 ✅ Done, US-504 ✅ Done, US-505 ✅ Done, US-506 ✅ Done, US-507 ✅ Done, US-508 ✅ Done, US-509 Done (D108), US-510 Done (D109), US-511 Done (D110) | Ledger create/list/detail/edit/revert/delete, idempotency, reconciliation and concurrency suite.                                      |
| EP-06 | US-601 Done (D111), US-602 Done (D112), US-603 Done (D113), US-604 Done (D114), US-605 Done (D115), US-606 Done (D116), US-607 Done (D117), US-608 Done (D118)                             | Schedule create/list/edit, pause/resume, execute, cancel occurrence, due preview/catch-up, auto-apply job and delete/stop conditions. |
| EP-07 | US-701 Done (D119), US-702 Done (D120), US-703 Done (D121), US-704 Done (D122), US-705 Done (D123), US-706 Done (D124)                                                                     | Period close, backfill/gap repair, read endpoints, closing jobs, frozen reads and lifecycle coverage.                                 |
| EP-08 | US-801 Done (D125), US-802 Done (D126), US-803 Done (D127), US-804 Done (D128), US-805 Done (D129), US-806 Done (D130)                                                                     | Dashboard, account progression, movement progression, category distribution, scheduled commitments and range guards.                  |
| EP-09 | US-901 Done (D131), US-902 Done (D132)                                                                                                                                                     | Preferences get/patch and defaults/forward compatibility.                                                                             |
| EP-10 | US-1001 Done (D133), US-1002 Done (D134), US-1003 Done (D135), US-1004 Done (D136)                                                                                                         | Job locks, metrics/alerts/logs, retention and hardening. Backend operational only.                                                    |
| EP-11 | US-1101–US-1106 implemented, verified and committed as `9674fe1` (D137–D139)                                                                                                               | Test harness and E2E/performance gates. Backend verification only.                                                                    |

The document control line of the backend plan additionally records that EP-08
and EP-09 are complete, EP-10 is done, verified, committed and pushed as
`067cccb`, and EP-11 is implemented, verified and committed as `9674fe1`.

## 3. Target architecture for `apps/web`

### 3.1 Runtime shape

```text
Angular 22 PWA (apps/web)
  ├─ app.config.ts
  │    ├─ provideHttpClient(withInterceptors([...]))
  │    ├─ provideRouter(routes)
  │    ├─ provideServiceWorker(...)
  │    └─ API_BASE_URL / runtime configuration provider
  ├─ core/api/
  │    ├─ generated or hand-written typed API services (HttpClient)
  │    ├─ auth interceptor
  │    ├─ envelope/error interceptor
  │    ├─ idempotency interceptor helper
  │    └─ correlation-id propagation helper
  ├─ core/stores/
  │    ├─ API-backed signal stores (cache + call state)
  │    └─ no localStorage business stores
  ├─ core/models/
  │    ├─ view models mapped from @peco/contracts
  │    └─ no duplicated domain value sets
  └─ features/*/
       └─ components consume stores; no direct persistence logic
```

### 3.2 Configuration

The web app currently has no API configuration token. Add a single typed
injection token, for example `API_BASE_URL`, and resolve it from a deployable
runtime configuration asset rather than hardcoding `http://localhost:3000/api`
in services. The implemented bootstrap uses the global prefix `api`, so the value must
include `/api` for all client routes except `/health`; health remains outside the
prefix. The plan's section 8.1 text mentions `/api/v1`, but the implemented
`main.ts` sets `setGlobalPrefix('api')`; the UI must target the implemented path
until a versioned prefix is actually introduced.

Local defaults derived from the repository configuration:

```ts
API_BASE_URL = 'http://localhost:3000/api';
```

Production must supply the deployed API origin explicitly. Because the web
Docker image serves static assets only, do not bake secrets into the bundle.
The API origin is not a secret, but it must still be environment-specific.

### 3.3 HTTP concerns to centralize

Implement once in interceptors or a shared request helper:

1. `Authorization: Bearer <accessToken>` on protected routes.
2. Refresh-on-401 flow using the completed rotation endpoints.
3. Unwrapping `ApiSingleSuccess<T>` / `ApiListSuccess<T, M>` envelopes.
4. Converting `ApiError` into a typed UI error carrying `statusCode`, `code`,
   `message`, optional `details` and `correlationId`.
5. Propagating `X-Correlation-Id` when the UI already has one, otherwise
   displaying the id returned by the API in error states.
6. Generating a UUID `Idempotency-Key` for the financial writes that require it.
7. Sending the contract-defined `version` field in the request body on optimistic
   updates; the implemented contract does not use `If-Match`.
8. Never caching API responses in the service worker or in application state
   beyond the lifetime of the current session (D72).

> The exact header names and required routes are fixed by the API contract
> inventory in section 5. Any mismatch must be resolved in favor of the
> backend implementation.

## 4. Data and type migration

### 4.1 Remove local persistence as the source of truth

The current web app persists business state under `peco.*` keys. After the
migration these keys are no longer read or written:

- `peco.accounts`
- `peco.movements`
- `peco.catalog.categories`
- `peco.scheduled-transactions`
- `peco.period-snapshots`
- `peco.user-preferences`
- `peco.schema-version`
- backup-related keys and legacy aliases

Do not implement a converter from these keys to API payloads. Q15 decides that
v1 starts fresh. Theme and the PWA banner dismissal timestamp are still
client-side concerns, but US-901/US-902 implement them as server preferences, so
they must be read from and written to `/preferences` after authentication.

### 4.2 Contract-first mapping

Use the shared libraries as the wire boundary:

- `@peco/enums` for every fixed domain value set: account types, movement
  types, statuses, frequencies, error codes, themes and all other registries.
- `@peco/contracts` for request and response types: `AuthResponse`,
  `AccountResponse`, `MovementResponse`, `PeriodSnapshotResponse`, envelope
  types, error codes and all DTO interfaces.
- `@peco/utils` for pure math shared with the API: cents conversion/formatting,
  UTC date helpers and balance impact helpers already present in the web app.

Representative wire types already exported by `@peco/contracts` include
`AuthResponse`, `UserResponse`, `AccountResponse`, `AccountSummary`,
`AccountBalanceUpdate`, `CategoryResponse`, `MovementResponse`,
`CreateMovementResponse`, `UpdateMovementResponse`, `RevertMovementResponse`,
`DeleteAccountResult`, `ScheduledTransactionResponse`, `ScheduledOccurrenceResponse`,
`ApplyDueResponse`, `PeriodSnapshotResponse`, `PeriodSummaryResponse`,
`DashboardReportResponse`, `AccountProgressionResponse`,
`MovementProgressionResponse`, `CategoryDistributionResponse`,
`ScheduledCommitmentsResponse`, `PreferencesResponse`, `UserDataExport`,
`ApiSingleSuccess<T>`, `ApiListSuccess<T, M>`, `ApiError` and `ApiErrorCode`.

Inside `apps/web`, keep `AGENTS.md` naming rules by defining view models in
`app/core/models/name.model.ts`, request types in `app/core/dtos/name.dto.ts`
when needed, and mappers in `app/core/utils/name.util.ts`. A mapper must convert
wire values to view values at exactly one place per domain.

`@peco/enums` currently exports the domain registries the web app needs:
`AccountTypeEnum`, `CategoryApplyTypeEnum`, `MovementTypeEnum`,
`RecurrenceFrequencyEnum`, `ScheduledTransactionTypeEnum`, `AppThemeEnum`,
`ApiErrorCodeEnum`, `AccountWriteStatusEnum`, `MovementWriteStatusEnum`,
`ScheduledExecutionStatusEnum`, `ScheduledExecutionReasonEnum`,
`ReportPeriodStatusEnum` and `RefreshRotationStatusEnum`. Use the enum type and
`Enum.MEMBER.toString()` at the wire boundary.

### 4.3 Money, IDs and time

- All API money fields are integer cents. The UI continues to accept decimal
  dollars in forms through `appCurrencyInput`, then converts with `toCents` at
  submit and `fromCents` when prefilling.
- Displays use `formatCentsToCurrency` or the `privacyCurrency` pipe. Never send
  decimal dollars to the API.
- Public identifiers are UUID strings (`publicId`). Internal numeric `id`
  values never leave the API and must not be modeled in the web app. Every v1
  `publicId` is newly generated; no legacy client id is preserved.
- Timestamps are ISO-8601 UTC strings. Use UTC conversion helpers for display
  and period boundaries; never derive the current period from browser-local
  time.
- Transaction and scheduled amounts stay positive magnitudes. Income/expense
  direction comes from the type field, not from the sign of the amount.
- Only `CREDIT` accounts may hold a negative balance. The UI keeps the existing
  Spanish validation message and store-side clamp while the API enforces the
  same invariant.

## 5. API surface to consume

> This section is the endpoint inventory to verify against
> `docs/backend/plan.md` section 8 and the implemented controllers before
> coding. Exact contract names and headers are recorded in the inventory
> matrices below.

Contract names by route family, all imported from `@peco/contracts`:

| Route family | Request contracts                                                                                                                                                                                                                                                     | Response contracts                                                                                                                                                         |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth         | `RegisterRequest`, `LoginRequest`, `RefreshRequest`, `ForgotPasswordRequest`, `ResetPasswordRequest`                                                                                                                                                                  | `AuthResponse`; logout/forgot/reset are `void` (`204`)                                                                                                                     |
| Users        | `UpdateUserRequest`, `ChangePasswordRequest`, `DeleteUserRequest`                                                                                                                                                                                                     | `UserResponse` for `PATCH /users/me` (`200`); export is an enveloped `UserDataExport` stream; password change and delete are `void` (`204`)                                |
| Accounts     | `CreateAccountRequest`, `UpdateAccountRequest`, `UpdateAccountPinRequest`                                                                                                                                                                                             | `AccountResponse`, `AccountResponse[]` with `meta.summary: AccountSummary`, `DeleteAccountResult`                                                                          |
| Categories   | `CreateCategoryRequest`, `UpdateCategoryRequest`                                                                                                                                                                                                                      | `CategoryResponse`, `CategoryResponse[]`                                                                                                                                   |
| Movements    | `CreateMovementRequest`, `UpdateMovementRequest`, `ListMovementsQuery`                                                                                                                                                                                                | `MovementResponse`, `CreateMovementResponse`, `UpdateMovementResponse`, `DeleteMovementResult`, `RevertMovementResponse`; lists carry `MovementListMeta`                   |
| Schedules    | `CreateScheduledTransactionRequest`, `UpdateScheduledTransactionRequest`, `ToggleScheduledTransactionRequest`, `ExecuteScheduledTransactionRequest`, `CancelScheduledOccurrenceRequest`, `ApplyDueRequest`, `ListScheduledTransactionsQuery`, `ListDueSchedulesQuery` | `ScheduledTransactionResponse`, `ExecuteScheduledTransactionResponse`, `CancelScheduledOccurrenceResponse`, `ApplyDueResponse`; lists carry `ScheduledTransactionListMeta` |
| Periods      | `ListPeriodsQuery`                                                                                                                                                                                                                                                    | `PeriodSummaryResponse[]`, `PeriodSnapshotResponse`                                                                                                                        |
| Reports      | `ReportPeriodQuery` and report-specific query DTOs                                                                                                                                                                                                                    | `DashboardReportResponse`, `AccountProgressionResponse`, `MovementProgressionResponse`, `CategoryDistributionResponse`, `ScheduledCommitmentsResponse`                     |
| Preferences  | `UpdatePreferencesRequest`                                                                                                                                                                                                                                            | `PreferencesResponse`                                                                                                                                                      |
| Health       | none                                                                                                                                                                                                                                                                  | flat `{status, uptime, db}`                                                                                                                                                |

Implemented differences from the plan catalog that the UI must honor:

1. The base path is `/api`; `/health` is outside it. The plan's `/api/v1`
   convention is not implemented.
2. `GET /auth/me` is not implemented. Rehydrate the signed-in user from the
   `user` field in `AuthResponse` returned by login, registration or refresh;
   there is no separate profile GET.
3. `DELETE /categories/:publicId` is not implemented. US-403 is skipped.
4. `PATCH /scheduled-transactions/:publicId` requires `Idempotency-Key` in the
   implementation even though the plan's required list omits it.
5. `GET /periods` returns the single envelope `{data: PeriodSummaryResponse[],
error: null}` with no `meta`. The envelope interceptor must not expect a list
   envelope for this route.
6. `GET /api` is an extra scaffold route and is not needed by the UI.

### 5.1 Public and health routes

| Method | Route                 | Auth | UI use                                                                        |
| ------ | --------------------- | ---- | ----------------------------------------------------------------------------- |
| `GET`  | `/health`             | No   | Optional connectivity/backend health indicator. Flat response, not enveloped. |
| `GET`  | `/docs`, `/docs-json` | No   | Developer reference only; not a runtime UI dependency.                        |

### 5.2 Auth and user routes

| Method   | Route                       | UI use                                              |
| -------- | --------------------------- | --------------------------------------------------- |
| `POST`   | `/api/auth/register`        | Create account and seed root account.               |
| `POST`   | `/api/auth/login`           | Sign in and receive token pair.                     |
| `POST`   | `/api/auth/refresh`         | Rotate refresh token and obtain a new access token. |
| `POST`   | `/api/auth/logout`          | Revoke the active refresh token/session.            |
| `POST`   | `/api/auth/forgot-password` | Request password reset.                             |
| `POST`   | `/api/auth/reset-password`  | Complete password reset.                            |
| `GET`    | `/api/users/me/export`      | Download the user's data as a single JSON document. |
| `PATCH`  | `/api/users/me`             | Update profile.                                     |
| `PATCH`  | `/api/users/me/password`    | Change password.                                    |
| `DELETE` | `/api/users/me`             | Delete user account.                                |

Exact request bodies that affect client code:

- `POST /auth/logout` requires both `Authorization: Bearer <accessToken>` and a
  `RefreshRequestDto` body `{refreshToken: string}`. It returns `204` with no
  body. It is the only protected auth route.
- `DELETE /users/me` requires a `DeleteUserRequestDto` body
  `{password: string}` containing the current password (8–128 characters). It
  returns `204`. The confirmation dialog must collect and submit it.
- `PATCH /users/me/password` returns `204`; `PATCH /users/me` returns the updated
  `UserResponse`.
- `POST /auth/forgot-password` and `POST /auth/reset-password` return `204`.

### 5.3 Accounts

| Method   | Route                                          | UI use                                                         |
| -------- | ---------------------------------------------- | -------------------------------------------------------------- |
| `GET`    | `/api/accounts`                                | Replace `AccountsStore` local load; includes computed summary. |
| `POST`   | `/api/accounts`                                | Create a non-root account with integer-cent `initialBalance`.  |
| `GET`    | `/api/accounts/:publicId`                      | Replace local account detail lookup.                           |
| `PATCH`  | `/api/accounts/:publicId`                      | Update account metadata with optimistic concurrency.           |
| `PATCH`  | `/api/accounts/:publicId/pin`                  | Set an explicit `pinToHome` value with optimistic concurrency. |
| `DELETE` | `/api/accounts/:publicId?transferToPublicId=…` | Delete a non-root account and transfer its balance atomically. |

Implemented account behavior to preserve:

- `GET /accounts` is ordered by `pinToHome`, then `name`.
- Summary uses gross `totalBalance`, `availableBalance` excluding `CREDIT` and
  `includeInTotal = false`, and positive `liabilitiesBalance`.
- `initialBalance` is required by `POST` in integer cents; `currentBalance`,
  `isRoot` and other server-owned fields are rejected if sent by the client.
- `creditLimit` is accepted only for `CREDIT`. Non-credit negative initial
  balance returns `400 NEGATIVE_BALANCE_NOT_ALLOWED`; later writes return `409`.
- `PATCH /accounts/:publicId` cannot change `initialBalance` or `currentBalance`.
- Pin sets an explicit `pinToHome` value; it is not a toggle and is idempotent.
- Delete with a non-zero balance needs `transferToPublicId`; self-transfer is
  `422`, foreign/unknown destination `404`, root `409 ROOT_ACCOUNT_PROTECTED`,
  closed month `409 PERIOD_CLOSED`. Success is `200` with
  `deletedAccountPublicId`, `transferMovement` and `balances`.

### 5.4 Categories

| Method  | Route                       | UI use                                                  |
| ------- | --------------------------- | ------------------------------------------------------- |
| `GET`   | `/api/categories`           | Replace `CatalogStore` system + user category list.     |
| `POST`  | `/api/categories`           | Create a user category; server derives slug.            |
| `PATCH` | `/api/categories/:publicId` | Update a user category; system/root rows are protected. |

Implemented category behavior to preserve:

- `GET /categories` returns global system rows plus only the caller's active
  rows, ordered by `displayName`; the root row appears exactly once.
- `name` is a server-derived normalized slug; the UI edits `displayName` only.
  Case/accent variants collide as `CATEGORY_NAME_TAKEN`.
- System/root rows are protected with `CATEGORY_SYSTEM_PROTECTED`.
- The 10-row global catalog is seeded once, not per user.

US-403 (delete and reassign) is deliberately skipped. Do not render a category
delete/reassign action even though the plan text describes it, because no
implemented endpoint exists.

### 5.5 Movements

| Method   | Route                             | UI use                                                              |
| -------- | --------------------------------- | ------------------------------------------------------------------- |
| `POST`   | `/api/movements`                  | Create a movement; backend writes ledger and balances.              |
| `GET`    | `/api/movements`                  | Replace local movement list/filter/totals.                          |
| `GET`    | `/api/movements/:publicId`        | Replace local movement detail.                                      |
| `PATCH`  | `/api/movements/:publicId`        | Partial edit, delta algorithm or atomic type replace on the server. |
| `DELETE` | `/api/movements/:publicId`        | Replace local delete/reversal construction.                         |
| `POST`   | `/api/movements/:publicId/revert` | Ask the backend to create the contra movement atomically.           |

Implemented movement behavior to preserve:

- Create requires a positive integer-cent `amount`; `TRANSFER` requires a
  different owned destination. Omitted category falls back to root per type.
  A category that rejects the type returns `CATEGORY_NOT_COMPATIBLE`.
- `POST` and partial `PATCH` return `{movement, balances}`; `revert` returns
  `{original, reversal, balances}`. Use the returned `balances` to refresh
  account cards; do not compute deltas locally.
- `DELETE /movements/:publicId` is `200`, not `204`. It returns
  `DeleteMovementResult` = `{deletedPublicId, balances: AccountBalanceUpdate[]}`.
  Remove the row by `deletedPublicId` and replace affected account balances from
  the response.
- `GET /movements` accepts `excludeReversals` as a transformed boolean, default
  `false`. Bind it to `movements.hideReversal` instead of filtering locally.
- `date` is immutable on edit. Same-type patch uses
  `impact(after) − impact(before)` on the server.
- A type change is an atomic replace: the original is soft-deleted, a new
  `publicId` is returned with `version = 0`, and `replacesPublicId` links them.
  The UI must swap the list/detail item to the returned movement.
- Reversal creates a dated contra with `isReversal: true`, marks the original
  `isReversed: true`, and links via `reversalOfPublicId`. Both rows become
  immutable; closed months require a compensating movement in the current
  period instead.
- Canceled movements have zero impact and are excluded from reports.
- Embedded `account`, `targetAccount` and `category` summaries keep rows
  renderable after soft-deletes.
- Scheduled-execution movements are editable/deletable but cannot change type;
  that returns `MOVEMENT_LOCKED` and the schedule must be edited instead.

The UI must stop calling local helpers such as `movementBalanceImpact` and
`buildReversalMovement` to decide persisted effects. Shared utilities may remain
for display-only calculations if they are exported from `@peco/utils`.

### 5.6 Scheduled transactions

| Method   | Route                                                     | UI use                                     |
| -------- | --------------------------------------------------------- | ------------------------------------------ |
| `POST`   | `/api/scheduled-transactions`                             | Create a schedule and its occurrence grid. |
| `GET`    | `/api/scheduled-transactions`                             | Replace local schedule list.               |
| `GET`    | `/api/scheduled-transactions/due`                         | Replace local due/pending projection.      |
| `POST`   | `/api/scheduled-transactions/apply-due`                   | On-demand catch-up.                        |
| `GET`    | `/api/scheduled-transactions/:publicId`                   | Replace local schedule detail.             |
| `PATCH`  | `/api/scheduled-transactions/:publicId`                   | Edit schedule.                             |
| `PATCH`  | `/api/scheduled-transactions/:publicId/toggle`            | Pause/resume.                              |
| `POST`   | `/api/scheduled-transactions/:publicId/execute`           | Execute one occurrence.                    |
| `POST`   | `/api/scheduled-transactions/:publicId/cancel-occurrence` | Cancel an occurrence.                      |
| `DELETE` | `/api/scheduled-transactions/:publicId`                   | Delete/stop schedule.                      |

Route ordering matters: `due` and `apply-due` are declared before
`:publicId`. The UI must use the dedicated routes instead of deriving due state
locally.

Implemented schedule behavior to preserve:

- The client sends only `anchorDate`; `nextContemplatedDate` and
  `nextExecutionDate` are server-owned and read-only.
- Period isolation is computed by the server: past periods show processed
  executions, current periods show processed plus pending current-month
  occurrences, future periods show projected grid points. The UI must not
  reimplement this filtering.
- `PATCH` affects future occurrences only. Resume fast-forwards past grid
  points, so paused time is never back-billed.
- `execute` requires `active` and `nextExecutionDate <= today UTC`; otherwise
  `SCHEDULE_INACTIVE` / `SCHEDULE_NOT_DUE`. It returns
  `ExecuteScheduledTransactionResponse` =
  `{occurrence, movement: MovementResponse | null, schedule, balances: AccountBalanceUpdate[]}`.
  The `movement` is `null` when the occurrence was skipped because the period is
  closed.
- A closed occurrence period is a terminal `SKIPPED` / `PERIOD_CLOSED` with no
  movement, and the schedule still advances.
- `cancel-occurrence` returns `CancelScheduledOccurrenceResponse` =
  `{occurrence, movement, schedule}`. The movement is a balance-neutral row and
  there is no `balances` array. In a closed period it returns `PERIOD_CLOSED`
  and leaves the occurrence due.
- `apply-due` returns `ApplyDueResponse` =
  `{asOf, results: ApplyDueResult[], schedules: ScheduledTransactionResponse[], applied, skipped, failed, skippedWhileInactive}`.
  Each `ApplyDueResult` is
  `{schedulePublicId, contemplatedDate, occurrenceDate, status, movementPublicId, reason}`.
  It is oldest-first, capped at 500 occurrences per schedule per run. Due
  preview exposes `skippedWhileInactive` and `pendingOccurrences` in `meta`.
- Inactive users are skipped after 90 days; occurrences older than the 7-day
  grace window are skipped with reason `INACTIVE_USER` and no movement. Show the
  Spanish summary: "se omitieron N cobros mientras no usaste la app".
- `FAILED` executions keep both next dates unchanged and retry; three failures
  pause the schedule. Render `"Finalizado"` when a stop condition is met and
  `"Pausado"` otherwise.

### 5.7 Periods and snapshots

| Method | Route                        | UI use                                         |
| ------ | ---------------------------- | ---------------------------------------------- |
| `GET`  | `/api/periods`               | Replace locally discovered period list.        |
| `GET`  | `/api/periods/:period`       | Replace locally built `PeriodSnapshot` detail. |
| `POST` | `/api/periods/:period/close` | Explicit close action if exposed by the UI.    |

`GET /periods` defaults to the last 12 months and allows at most 24.
`GET /periods/:period` returns `404` when the month is not closed.
`POST /periods/:period/close` is idempotent: first close is `201`, replay is
`200`; current/future months return `PERIOD_NOT_CLOSABLE`, and months before
first activity return `PERIOD_BEFORE_ACTIVITY`.

`PeriodSnapshotsStore` and `buildPeriodSnapshot` become read-side adapters only
if needed for view shaping; they must no longer generate or close snapshots.
Closed periods are immutable: no reopen endpoint exists, and corrections are new
movements in the current period. A past period without a snapshot reads the live
ledger because the closing job has not reached it yet; movement lists always read
`movements`, never the snapshot. The UI must disable mutations for a selected
closed period and surface `PERIOD_CLOSED` when a stale view attempts one.

Snapshot rows freeze `accountName`, `accountType`, `color`, `icon` and
`includeInTotal`, so an account deleted or renamed after closing still renders
correctly. Per-account transfer counts include both sides, while the global
`totalTransactionsCount` counts each movement once.

### 5.8 Reports

| Method | Route                                         | UI use                                    |
| ------ | --------------------------------------------- | ----------------------------------------- |
| `GET`  | `/api/reports/dashboard`                      | Replace dashboard aggregation.            |
| `GET`  | `/api/reports/accounts/:publicId/progression` | Replace account progression chart data.   |
| `GET`  | `/api/reports/movements/progression`          | Replace movement progression chart data.  |
| `GET`  | `/api/reports/categories/distribution`        | Replace category distribution chart data. |
| `GET`  | `/api/reports/scheduled/commitments`          | Replace scheduled commitments report.     |

All five report routes share one resolver for optional `period` **or** ordered
`from`/`to` month parameters. `period` and `from`/`to` are mutually exclusive.
When both are omitted, the API returns the current UTC month plus a default
window of the previous twelve months. Explicit ranges are capped at 24 months;
invalid ranges return `VALIDATION_ERROR`. The web period selector must send
these parameters rather than filtering response arrays locally.

Route-specific query requirements:

- `GET /reports/categories/distribution` requires `type`. Valid values are only
  `MovementTypeEnum.INCOME.toString()` and
  `MovementTypeEnum.EXPENSE.toString()`; `TRANSFER` returns `VALIDATION_ERROR`.
  Send the enum value, never a literal `INCOME`/`EXPENSE` string.
- `GET /reports/movements/progression` accepts optional `excludeReversals`
  (`true`/`false`, default `false`). Bind it to `movements.hideReversal` for
  consistency with the movement list.
- The other three report routes accept only the shared period/range parameters;
  do not send `type` or `excludeReversals` to them.

Closed periods read frozen snapshots; current and future periods read the live
ledger. `globalFinalBalance` is gross and must never be labeled as
"disponible"; `availableBalance` excludes `CREDIT` accounts and rows with
`includeInTotal = false`.

### 5.9 Preferences

| Method  | Route              | UI use                                                     |
| ------- | ------------------ | ---------------------------------------------------------- |
| `GET`   | `/api/preferences` | Load server preferences after authentication.              |
| `PATCH` | `/api/preferences` | Persist preference changes through `UserPreferencesStore`. |

The implemented wire shape is nested:

```ts
{
  theme: 'light' | 'dark' | 'system',
  pwaBannerDismissedAt: string | null,
  accounts: {hideBalance: boolean},
  movements: {hideReversal: boolean},
  updatedAt: string | null
}
```

Canonical defaults are `theme = light`, `pwaBannerDismissedAt = null`,
`hideBalance = false` and `hideReversal = true`. `PATCH` deep-merges only the
sent sections; unknown top-level or nested fields are rejected with dotted
`details.fields` paths. A missing row reads as defaults with `updatedAt: null`;
the first `PATCH` upserts from defaults.

The web app must keep one store API for settings and route all preference reads
and writes through it. The UI must render missing fields from the normalized
response and add a Spanish toggle for `movements.hideReversal` that controls the
`excludeReversals` query parameter on movement lists.

## 6. Session and auth migration

### 6.1 Token policy to implement in the client

Registration creates the user, the single root account and the canonical
preferences row in one transaction, and automatically logs the user in. The root
account is named `Efectivo`, type `CASH`, balance `0`, `includeInTotal = true`
and `pinToHome = true`. The UI must not seed local accounts or categories.

The implemented backend policy (D22) is:

- Access token lifetime: **15 minutes**, JWT with the user's `publicId` as `sub`.
- Refresh token lifetime: **30 minutes**, stored hashed and rotated on every
  refresh.
- Every refresh revokes the previous row and issues a new pair.
- Reuse of a revoked refresh token means theft: the whole token family is
  revoked and the user must log in again.
- After 30 minutes of inactivity the user re-authenticates.

The client must therefore:

1. Store the token pair in a dedicated session service, not in business
   `localStorage` keys.
2. Attach the access token to protected requests.
3. On a 401, attempt exactly one refresh, replace the token pair, and retry the
   original request once.
4. On refresh failure, clear the session and navigate to login. Never retry with
   the old refresh token.
5. Call logout explicitly so the server can revoke the active token row.
6. Clear all in-memory business caches on login, logout, user deletion and
   session invalidation.

Logout returns `204` but is not bodyless: send the active `refreshToken` in the
`RefreshRequestDto` body together with the bearer token. Forgot-password and
reset-password are bodyless `204`. `INVALID_CREDENTIALS` is uniform for unknown
email, wrong password and soft-deleted users. Password reset revokes
every refresh token. Email is immutable and reserved forever, including after
account deletion. Only five auth routes and `/health` are public; everything
else requires `Authorization: Bearer <accessToken>`.

### 6.2 Routing

Add an authenticated shell and guards:

- Public: login, register, forgot password, reset password.
- Protected: dashboard, accounts, movements, scheduled transactions, settings,
  periods and reports.
- Unauthenticated access to a protected route redirects to login.
- Authenticated access to a public auth route redirects to the dashboard.
- Route data loading must tolerate loading/error call states instead of assuming
  synchronous local stores.

### 6.3 Profile and account lifecycle

Settings must replace local-only actions with:

- `PATCH /users/me` for profile changes.
- `PATCH /users/me/password` for password changes.
- `DELETE /users/me` for account deletion, with an explicit confirmation flow.
- `GET /users/me/export` for JSON export. This replaces the old device backup
  export screen; import and reset are removed.

## 7. Store-by-store migration

### 7.1 Persistence services

Replace or retire the local storage services:

| Current service area           | Replacement                                                       |
| ------------------------------ | ----------------------------------------------------------------- |
| Accounts storage               | `AccountsApiService` using `/accounts`                            |
| Movements storage              | `MovementsApiService` using `/movements`                          |
| Categories/catalog storage     | `CategoriesApiService` using `/categories`                        |
| Scheduled transactions storage | `ScheduledTransactionsApiService` using `/scheduled-transactions` |
| Period snapshots storage       | `PeriodsApiService` using `/periods`                              |
| User preferences storage       | `PreferencesApiService` using `/preferences`                      |
| Data backup service            | Retire; keep only `/users/me/export`                              |
| Schema/amount migration        | Retire; backend owns schema                                       |

### 7.2 Signal stores

Keep the existing `@ngrx/signals` store shape where possible, but change the
source of truth:

- `AccountsStore`: load from `GET /accounts`; mutations call the API then replace
  affected entries from the response, including refreshed balances and
  `version`.
- `CatalogStore`: load from `GET /categories`; create/update call the API and
  replace the returned row.
- `MovementsStore`: load from `GET /movements`; create/edit/delete/revert call
  the API and rely on returned `balances` and hydrated rows. Do not compute or
  persist balance deltas locally.
- `ScheduledTransactionsStore`: load from `GET /scheduled-transactions`; use
  `GET /due` for projections; execute/cancel/apply-due call the API.
- `PeriodSnapshotsStore`: read-only adapter over `GET /periods` and
  `GET /periods/:period`.
- `GlobalPeriodStore`: still owns the selected `YYYY-MM` context, but validates
  it against server period data and treats past closed periods as read-only.
- `UserPreferencesStore`: load from `GET /preferences`; every update calls
  `PATCH /preferences` and commits only the normalized server response. It must
  expose `theme`, `pwaBannerDismissedAt`, `accounts.hideBalance` and
  `movements.hideReversal` from the server payload.
- `ChangelogStore`: unchanged; it remains a static JSON consumer.

Use `withCallState()` or an equivalent loading/error state for every API-backed
store. Components must render loading, empty, error and success states.

### 7.3 Removed local domain logic

The following local responsibilities move to the backend and must be removed
from mutation paths:

- `movementBalanceImpact` decisions and account balance rewrites.
- `buildReversalMovement` and local reversed-pair construction.
- Scheduled occurrence generation, clamping, business-day adjustment and
  stop-condition evaluation.
- Due-date projection and catch-up application.
- Period gap detection, sequential closing and snapshot construction.
- Dashboard/chart aggregation from raw local arrays.
- Optimistic conflict detection based on local state; use server `version`.

### 7.4 Concrete file surface

The highest-impact current files are:

| Area            | Files                                                                                                                                                                                                                                                                                                 |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bootstrap       | `apps/web/src/app/app.config.ts`, `apps/web/src/app/app.component.ts`, `apps/web/src/app/app.routes.ts`                                                                                                                                                                                               |
| Accounts        | `core/stores/accounts.store.ts`, `core/services/accounts-storage.service.ts`, `features/accounts/accounts.component.ts`, `features/accounts/detail/account-detail.component.ts`, `features/accounts/components/account-form-modal.component.ts`                                                       |
| Movements       | `core/stores/movements.store.ts`, `core/services/movements-storage.service.ts`, `features/movements/movements.component.ts`, `features/movements/components/movement-form-modal.component.ts`, `shared/components/movement-list/movement-list.component.ts`                                           |
| Categories      | `core/stores/catalog.store.ts`, `core/services/catalog-storage.service.ts`, `features/settings/components/categories-settings/categories-settings.component.ts`                                                                                                                                       |
| Schedules       | `core/stores/scheduled-transactions.store.ts`, `core/services/scheduled-transactions-storage.service.ts`, `features/scheduled/scheduled-transactions.component.ts`, `features/scheduled/components/scheduled-transaction-form-modal.component.ts`                                                     |
| Periods         | `core/stores/period-snapshots.store.ts`, `core/stores/global-period.store.ts`, `core/services/period-snapshots-storage.service.ts`, `shared/components/global-period-selector/global-period-selector.component.ts`, `features/dashboard/dashboard.component.ts`                                       |
| Preferences     | `core/stores/user-preferences.store.ts`, `core/services/user-preferences-storage.service.ts`, `core/models/user-preferences.model.ts`, `features/settings/components/user-preferences-settings/user-preferences-settings.component.ts`                                                                |
| Data lifecycle  | `core/services/data-backup.service.ts`, `core/models/backup-data.model.ts`, `features/settings/components/data-settings/data-settings.component.ts`                                                                                                                                                   |
| Types/constants | `core/types/account-type.type.ts`, `core/types/movement-type.type.ts`, `core/types/category-apply-type.type.ts`, `core/types/recurrence-frequency.type.ts`, `core/constants/seed-accounts.constant.ts`, `core/constants/seed-categories.constant.ts`, `core/constants/local-storage-keys.constant.ts` |
| Money boundary  | `core/utils/to-cents.util.ts`, `core/utils/from-cents.util.ts`, `core/utils/format-cents-to-currency.util.ts`, `shared/directives/currency-input.directive.ts`                                                                                                                                        |

Only presentation constants such as palettes, labels and icon metadata may stay
local. Domain unions must be replaced by types derived from `@peco/enums`.

## 8. UI behavior changes

### 8.1 Inset grouped list pattern

All migrated lists continue to follow the existing unified inset grouped list
pattern: one `bg-white rounded-2xl border border-slate-200/80 divide-y
divide-slate-100 overflow-hidden shadow-sm` container with internal rows, not
one card per item.

### 8.2 Privacy preference

The `privacyCurrency` pipe remains the only way to obscure balances. It must
consume `UserPreferencesStore`, which now reads the server preference. All
account, movement, summary and report monetary displays continue to use it.
The new `movements.hideReversal` preference must be applied as the
`excludeReversals` query parameter on movement list requests, not by filtering
the response locally.

### 8.3 Accessibility

- All new auth and error states need Spanish accessible labels and live-region
  announcements for errors.
- Icon-only buttons keep Spanish `aria-label` values and use `<app-icon>`.
- Focus moves to the first invalid field on validation errors and back to the
  triggering control after modal dismissal.
- Loading/disabled states must be communicated to assistive technology.

### 8.4 Behavioral corrections required by the server contract

Some current local behavior conflicts with implemented backend rules and must be
corrected, not preserved:

- The dashboard currently uses `globalFinalBalance` as `availableBalance` for
  past periods. The backend defines `globalFinalBalance` as gross; use the
  report's `balances.availableBalance`, which excludes `CREDIT` accounts and
  `includeInTotal = false`.
- Any client-only "same-day edit lock" is not an implemented backend rule.
  Enable edit based on server state and react to `MOVEMENT_LOCKED` /
  `PERIOD_CLOSED` instead of inventing a local rule.
- `pinToHome` is currently a toggle locally; the API requires an explicit
  boolean. Send the intended value, not the inverse of local state.
- Category deletion/reassignment currently lives in `CatalogStore`; remove it
  because US-403 is deliberately skipped.
- Local seed accounts and the 10-row seed category catalog are created by the
  backend at registration. Remove client seeding.
- `GlobalPeriodStore` is presentation context only. It must not be trusted to
  authorize writes; the server's period checks are authoritative.
- Scheduled period isolation and monthly commitment math are server-side. Keep
  presentation helpers only for formatting, not for deciding which occurrences
  exist.

## 9. Error, concurrency and immutability handling

### 9.1 Response envelope

Every response with a body except `/health` uses the implemented envelope
(G1/D65):

```ts
// single-resource success: no meta
{data: T, error: null}

// list success
{data: T[], meta: {correlationId, nextCursor?, totals?, summary?, count?}, error: null}

// error
{data: null, error: {statusCode, code, message, details?, correlationId}}

// no-content routes
204 no content

// health only
{status: 'ok', uptime: 1234, db: 'up'}
```

`204` routes are: `POST /auth/logout`, `POST /auth/forgot-password`,
`POST /auth/reset-password`, `PATCH /users/me/password`, `DELETE /users/me` and
`DELETE /scheduled-transactions/:publicId`. Deletes that return a body are
`DELETE /accounts/:publicId` (`200` with `DeleteAccountResult`) and
`DELETE /movements/:publicId` (`200` with `DeleteMovementResult`).

The interceptor strips the envelope exactly once: single responses become `data`,
list responses become `{data, meta}`, errors become a typed client error object,
and `204` becomes `void`. No store, view or test depends on the raw envelope.
`meta` is transport-only: `nextCursor`, `totals`, `summary`, `count` and the
mandatory `correlationId`; it must not be used for domain state.

Every response carries `X-Correlation-Id`; list successes repeat it as
`meta.correlationId` and errors as `error.correlationId`. Show it in error
details so support can trace the request.

### 9.2 Stable error codes

Use `@peco/enums` error codes rather than string literals. The implemented code
catalog is:

| HTTP | Code                           | UI meaning                                                   |
| ---- | ------------------------------ | ------------------------------------------------------------ |
| 400  | `VALIDATION_ERROR`             | Invalid field or unknown field; show `error.details.fields`. |
| 400  | `PAYLOAD_TOO_LARGE`            | Body over 1 MB.                                              |
| 400  | `INVALID_RESET_TOKEN`          | Reset link invalid or expired.                               |
| 400  | `NEGATIVE_BALANCE_NOT_ALLOWED` | Negative initial balance on a non-credit account.            |
| 401  | `UNAUTHORIZED`                 | Missing/invalid bearer token.                                |
| 401  | `TOKEN_EXPIRED`                | Refresh once, then retry the original request.               |
| 401  | `INVALID_CREDENTIALS`          | Uniform login failure message.                               |
| 401  | `REFRESH_TOKEN_REUSED`         | Theft detected; clear session and force login.               |
| 401  | `REFRESH_TOKEN_EXPIRED`        | Clear session and force login.                               |
| 403  | `FORBIDDEN`                    | Authenticated but not allowed.                               |
| 404  | `NOT_FOUND`                    | Unknown, foreign or soft-deleted resource.                   |
| 409  | `EMAIL_ALREADY_REGISTERED`     | Email is reserved.                                           |
| 409  | `VERSION_CONFLICT`             | Refetch using `details.currentVersion`.                      |
| 409  | `IDEMPOTENCY_KEY_REUSED`       | Same key reused with different payload.                      |
| 409  | `PERIOD_CLOSED`                | Mutation locked by a closed UTC month.                       |
| 409  | `MOVEMENT_LOCKED`              | Reversed, canceled, schedule-owned or type change blocked.   |
| 409  | `ROOT_ACCOUNT_PROTECTED`       | Root account cannot be deleted.                              |
| 409  | `CATEGORY_SYSTEM_PROTECTED`    | System/root category cannot be edited.                       |
| 409  | `CATEGORY_NAME_TAKEN`          | Slug collision.                                              |
| 409  | `TRANSFER_REQUIRED`            | Account deletion needs a destination.                        |
| 409  | `NEGATIVE_BALANCE_NOT_ALLOWED` | Later write would make a non-credit balance negative.        |
| 409  | `PERIOD_NOT_CLOSABLE`          | Current/future month cannot be closed.                       |
| 409  | `SCHEDULE_NOT_DUE`             | Occurrence is not due yet.                                   |
| 409  | `SCHEDULE_INACTIVE`            | Schedule is paused/inactive.                                 |
| 409  | `OCCURRENCE_ALREADY_PROCESSED` | Duplicate execute/cancel or stale slot.                      |
| 422  | `PERIOD_BEFORE_ACTIVITY`       | Period predates first activity.                              |
| 422  | `UNPROCESSABLE_ENTITY`         | Semantically invalid request.                                |
| 422  | `CATEGORY_NOT_COMPATIBLE`      | Category does not accept the movement type.                  |
| 429  | `RATE_LIMITED`                 | Show `Retry-After`.                                          |
| 500  | `INTERNAL_ERROR`               | Generic Spanish message; never leak internals.               |

Every query is scoped by the authenticated `userId`; an unknown, foreign or
soft-deleted `publicId` returns `404 NOT_FOUND`, never `403`. Do not reveal
resource existence in UI copy.

Rate limits relevant to UI behavior: mutations 120/min per user, reads 300/min
per user, and separate auth limits for login/register/forgot/reset. A `429`
response must disable the submit action until `Retry-After` elapses.

Never compare raw code strings in production code.

### 9.3 Optimistic concurrency, idempotency and immutability

- `accounts.version`, `movements.version` and `scheduledTransactions.version`
  start at `0` and increment on every row-changing write, including balance-only
  changes. `PATCH /accounts/:publicId`, `PATCH /movements/:publicId` and
  `PATCH /scheduled-transactions/:publicId` accept `version`. On
  `VERSION_CONFLICT`, refetch and let the user reapply the change; do not
  silently overwrite.
- Omitted `version` is last-write-wins except for balance mutations, which still
  use locked transactions on the server. The client should always send it.
- Closed periods are immutable. Before enabling create/edit/delete/revert/execute
  actions, check the selected period against server period data. The backend is
  authoritative; a `PERIOD_CLOSED` response must disable the form and explain in
  Spanish that a compensating movement in the current period is required.
- `Idempotency-Key` is an 8–128 character value, preferably UUID v4, and is
  required on:
  - `POST /movements`
  - `PATCH /movements/:publicId`
  - `POST /movements/:publicId/revert`
  - `POST /scheduled-transactions/:publicId/execute`
  - `POST /scheduled-transactions/:publicId/cancel-occurrence`
  - `POST /scheduled-transactions/apply-due`
  - `POST /periods/:period/close`
- Retrying the same user intent reuses the same key; a new intent generates a new
  key. Same key + same request body replays the stored response with
  `Idempotency-Replayed: true`; same key + different method, route, params or
  body returns `IDEMPOTENCY_KEY_REUSED`. Keys expire after 24 hours by default.

### 9.4 Validation and pagination the UI must respect

- `limit` defaults to 20, minimum 1, maximum 100. A value above 100 is a
  `VALIDATION_ERROR`; the UI must not clamp silently.
- `cursor` is opaque. Echo `nextCursor` from `meta`; never construct one. `null`
  means the last page.
- Movement text filter is `note`, not `q`. Totals cover the entire filtered set,
  including pages not yet loaded.
- `from`/`to` are inclusive `YYYY-MM-DD` values; `to` covers through
  `23:59:59.999Z`. More than 24 months is rejected. `period` and `from`/`to`
  are mutually exclusive.
- Field limits: email 5–254, passwords 8–128, names/display names 1–80, note
  0–500, color `#RRGGBB`, icon key 1–40, move amounts integer `>= 1`, interval
  1–365, `totalOccurrences` 1–10,000.
- `date` is a UTC ISO-8601 timestamp; calendar fields and period keys use
  `YYYY-MM-DD` / `YYYY-MM`. Never send browser-local date strings.

## 10. Implementation phases

### Phase 0 — Shared contract and HTTP foundation

1. Add `API_BASE_URL` and runtime configuration provider.
2. Add typed API services under `core/api/`.
3. Add auth, envelope/error, correlation and idempotency interceptors.
4. Add typed UI error model and Spanish error presentation component/service.
5. Replace domain magic strings with `@peco/enums` imports.
6. Verify `nx build web` and `nx test web` remain green before feature changes.

### Phase 1 — Authentication and shell

1. Implement auth routes and forms with reactive forms.
2. Implement session service and refresh flow.
3. Add route guards and authenticated shell.
4. Wire logout, profile, password change, delete and export.
5. Hydrate `/preferences` immediately after login so theme, privacy and PWA
   banner behavior work before feature stores load.
6. Clear caches on session changes.

### Phase 2 — Core catalogs and accounts

1. Replace `CatalogStore` with API-backed category reads/writes.
2. Replace `AccountsStore` with API-backed reads/writes, pin and delete-transfer.
3. Update account forms for integer cents and server version handling.
4. Remove local seed constants once the server seeds the catalog and root account.

### Phase 3 — Ledger

1. Replace movement list/detail/create/edit/delete with API calls.
2. Replace local reversal with `POST /movements/:publicId/revert`.
3. Use server-returned balances and hydrated rows.
4. Disable mutations for closed periods.

### Phase 4 — Schedules and periods

1. Replace schedule list/detail/create/edit/pause/resume/delete with API calls.
2. Replace local due projection with `GET /scheduled-transactions/due`.
3. Wire execute, cancel occurrence and apply-due.
4. Replace local snapshots with `/periods` reads and disable closed-period writes.

### Phase 5 — Reports and preferences

1. Replace dashboard and chart aggregation with `/reports/*` calls.
2. Send period/range query parameters from `GlobalPeriodStore`.
3. Finish `UserPreferencesStore` binding to `/preferences`, including
   `movements.hideReversal`.
4. Remove preference storage from `localStorage`.

### Phase 6 — Cleanup and verification

1. Delete obsolete storage services, seed constants and local domain utilities.
2. Remove backup/import/reset UI.
3. Ensure no `peco.*` business key is read or written.
4. Run the verification matrix in section 11.

## 11. Verification matrix

### 11.1 Automated checks

| Check                | Command / evidence                                                            |
| -------------------- | ----------------------------------------------------------------------------- |
| Web build            | `npx nx build web`                                                            |
| Web tests            | `npx nx test web`                                                             |
| API build            | `npx nx build api`                                                            |
| Nx affected pipeline | `npx nx affected -t lint test build`                                          |
| Module boundaries    | `npx nx graph` shows `web → shared`, `api → shared`, no app-to-app edge       |
| Formatting           | `npx nx format:check`                                                         |
| Contract parity      | OpenAPI document at `/docs-json` matches implemented routes                   |
| Persistence audit    | Search finds no business `localStorage`/`sessionStorage` writes in `apps/web` |

Specs that must be rewritten from `localStorage` setup to mocked HTTP responses
while keeping their behavioral assertions:

| Spec                                                                                                                                     | Must still verify                                                                                   |
| ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `core/stores/accounts.store.spec.ts`                                                                                                     | Root immutability, credit-only negative balance clamp, derived totals, API refresh after mutation.  |
| `core/stores/catalog.store.spec.ts`                                                                                                      | Root/system protection; no delete/reassign action.                                                  |
| `core/stores/stores.spec.ts`                                                                                                             | Movement impacts, transfer deltas, filtering and call state now come from server responses.         |
| `core/stores/scheduled-transactions.store.spec.ts`                                                                                       | Server-provided occurrences, execute/cancel/apply-due commands and period isolation.                |
| `core/stores/period-snapshots.store.spec.ts`                                                                                             | Immutable read-only snapshot consumption; no local gap closing.                                     |
| `core/stores/global-period.store.spec.ts`                                                                                                | Period navigation and labels; no write authorization.                                               |
| `core/stores/user-preferences.store.spec.ts`                                                                                             | Server round trip, theme side effects, `hideBalance` and `hideReversal`.                            |
| `core/stores/changelog.store.spec.ts`                                                                                                    | Existing `HttpTestingController` pattern remains the model for API store tests.                     |
| `core/services/*-storage.service.spec.ts`, `data-backup.service.spec.ts`, `migrate-amounts-to-cents.util.spec.ts`                        | Replace with API service/mapper specs; local persistence and migration specs are removed.           |
| Feature component specs under `features/accounts`, `features/movements`, `features/scheduled`, `features/dashboard`, `features/settings` | Same rendering behavior with HTTP-backed stores, loading/error states and disabled mutation states. |

Add new specs for auth/session: login, refresh success, refresh-token reuse,
logout, route guards and cache clearing. Add contract tests for envelope
unwrapping, correlation id propagation, `Idempotency-Key` reuse and
`VERSION_CONFLICT` handling.

### 11.2 Manual end-to-end flows

1. Register a new user: root account and default preferences are created by the
   backend; no local seed data is written.
2. Log in, refresh after access-token expiry, and log out; refresh-token reuse
   forces a new login.
3. Create, pin, update and delete an account with balance transfer; server
   balances and versions are reflected immediately.
4. Create, filter, detail, edit, revert and delete movements; balances come from
   API responses.
5. Create a schedule, preview due items, execute one occurrence, cancel one
   occurrence, pause/resume and apply due.
6. Select a past closed period: all mutation controls are disabled and stale
   attempts show `PERIOD_CLOSED`.
7. Open every report with period/from/to parameters and confirm the UI does not
   recompute values locally.
8. Change preferences and verify they survive logout/login via `/preferences`.
9. Export user data and confirm the JSON document comes from
   `/users/me/export`.
10. Verify the PWA shell still installs; data requires connectivity and no API
    response is cached.

### 11.3 Definition of done for the frontend migration

- The web app can operate against a fresh database with no `localStorage` seed.
- All business reads/writes go through `@peco/contracts`-typed API calls.
- Domain values come from `@peco/enums`; no duplicated literal unions remain.
- Money remains integer cents at the wire boundary and is converted only at
  forms and display.
- Auth, refresh rotation, logout and 401 retry are covered by tests.
- Error states display the stable code, Spanish message and correlation id.
- Closed-period and optimistic-concurrency behavior is covered by tests.
- `nx build web`, `nx test web` and the affected pipeline are green.
- No app-to-app imports or framework imports in `libs/shared/*` are introduced.

## 12. Work estimates and sequencing notes

The backend plan records the phase-2 frontend refactor as approximately
**80–140 h** (D69). The phase ordering above is the UI equivalent of that
estimate; it is not a backend schedule. EP-12 release-readiness stories are not
assumed complete and are not part of this plan.

## 13. Open items to confirm before implementation

These are frontend decisions not fixed by the completed backend plan:

1. Whether the production deployment exposes the API at a fixed origin or
   behind a reverse proxy on the web origin.
2. Whether auth tokens are held in memory only or persisted in a dedicated
   session storage slot. The backend policy fixes lifetimes and rotation, not
   the browser storage mechanism.
3. Whether settings should expose an explicit period-close action for
   `POST /periods/:period/close`, or leave closing entirely to the backend job.
4. The precise visual treatment of `meta` fields such as totals in list
   endpoints; the envelope shape is fixed, the layout is not.
5. Whether the existing `privacyCurrency` obscuring token (`'--.--'`) remains for
   report values after they move server-side.
