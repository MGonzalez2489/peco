# Peco

Peco is an Nx 24 integrated monorepo with:

- `apps/web`: Angular 22 PWA
- `apps/api`: NestJS API
- `libs/shared/contracts`, `libs/shared/utils`: framework-agnostic shared libraries

## Requirements

### Local development (Node/Nx)

- Node.js 22.x (see `.nvmrc`)
- npm 10+
- Docker Engine/Desktop with Docker Compose v2 (for MySQL and Docker-based runs)

### Docker-only runs

- Docker Engine/Desktop
- Docker Compose v2 (`docker compose`)

## Install

```bash
npm ci
```

## Configuration (US-102)

The API parses and validates its environment **once at boot** into a typed object
(`ConfigService`). A missing or invalid variable aborts startup with an error that
names the variable; production has no silent fallbacks. `TZ` is forced to `UTC`.

`.env.example` is the committed source of truth for every supported variable and
its documented default. Copy it to `.env` for local runs; never commit `.env`.

- **Required in production:** `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`,
  `DATABASE_PASSWORD`, `DATABASE_NAME`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
  (the two secrets must be at least 32 characters and distinct).
- **Development fallbacks:** the `DATABASE_*` connection values and JWT secrets
  have development-only defaults so the API boots against the Dockerized MySQL.
- **Durations:** token TTLs, cron expressions, `IDEMPOTENCY_TTL_HOURS`,
  `INACTIVE_USER_DAYS` and `MAX_BACKFILL_MONTHS` are all configuration values with
  documented defaults, never literals at the call site.
- Legacy `DB_*` names were replaced by `DATABASE_*` to match the plan. Update an
  existing local `.env` accordingly.

## Run with Docker

All Docker commands below must be run from the repository root. Compose uses `docker-compose.yml` and reads variables from `.env` when present (you can start from `.env.example`).

Optional ports/credentials (defaults shown):

- `DATABASE_PORT=3306`, `DATABASE_NAME=peco`, `DATABASE_USER=peco`, `DATABASE_PASSWORD=peco`, `DATABASE_ROOT_PASSWORD=root`
- `API_PORT=3000`, `WEB_PORT=8080`

### MySQL (database)

Required by the API health check and local API runtime.

```bash
# Start only MySQL
docker compose up -d mysql

# Stop
docker compose stop mysql
```

### API (`apps/api`)

- **Image/build:** `apps/api/Dockerfile` (multi-stage: `npm ci --legacy-peer-deps` + `nx run api:build:production`, then production deps in the runner stage, runs `node main.js`)
- **Runtime env:** `NODE_ENV`, `PORT`, `TZ`, `DATABASE_*`, `JWT_*_SECRET`, `CORS_ORIGINS`, `LOG_LEVEL`, `MAIL_TRANSPORT`, `RATE_LIMIT_ENABLED` (Compose sets `DATABASE_HOST=mysql`, `TZ=UTC` and waits for MySQL health)
- **Secrets:** Compose uses development placeholder JWT secrets by default; override `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` for any real deployment
- **Ports:** `http://localhost:3000` (`/api`, `/health`, `/docs`, `/docs-json`)

```bash
# Build and run API + MySQL
docker compose up --build -d api mysql

# Logs
docker compose logs -f api

# Stop
docker compose stop api mysql
```

### Web (`apps/web`)

- **Image/build:** `apps/web/Dockerfile` (multi-stage: `nx run web:build:production`, served by Nginx with SPA fallback)
- **Runtime:** static assets only (no backend env vars baked in at runtime)
- **Port:** `http://localhost:8080`

```bash
# Build and run Web
docker compose up --build -d web

# Logs
docker compose logs -f web

# Stop
docker compose stop web
```

### Run all apps with Docker

```bash
docker compose up --build -d

# Follow logs
docker compose logs -f

# Stop and remove containers (keeps DB volume)
docker compose down

# Stop and remove containers + DB volume
docker compose down -v
```

## Web app (local, Node/Nx)

```bash
npx nx serve web
npx nx build web
npx nx test web
```

## API (local, Node/Nx)

1. Copy environment variables:

```bash
cp .env.example .env
```

2. Start the API with Dockerized MySQL 8:

```bash
npm run start:dev
```

This starts MySQL via Docker Compose and serves the API (`nx serve api`).

- API: `http://localhost:3000/api`
- Health: `http://localhost:3000/health` (`200` with `{status, uptime, db:"up"}` when DB is reachable, `503` when DB ping fails)
- API docs: `http://localhost:3000/docs` (Swagger UI) and `http://localhost:3000/docs-json` (OpenAPI JSON generated from the DTOs)
- Responses: every client route returns `{data, meta}` on success and `{error: {statusCode, code, message, details?, correlationId}}` on failure; `/health` stays flat and `204` responses are bodyless (8.3)
- Correlation: send `x-correlation-id` to trace a request; when absent the API generates one and echoes it in the header and in `meta.correlationId`
- Logs: one structured JSON line per request with `correlationId`, optional `userId`, stable `route`, `statusCode` and `durationMs`. `LOG_LEVEL` defaults to `info`; production never logs request bodies, and passwords, tokens and authorization headers are redacted.
- Limits: JSON bodies over 1 MB return `413 PAYLOAD_TOO_LARGE`; `limit > 100` on a list endpoint returns `400 VALIDATION_ERROR` instead of being clamped.

## Database migrations

The API **never** creates or alters tables at boot: `synchronize` and `migrationsRun` are `false`. The schema changes only through reviewed migrations executed as a release step (D77).

The CLI scripts load `.env` from the repository root, so `DATABASE_HOST` must point to the MySQL instance reachable **from your machine** (`localhost` when the container publishes `3306`).

```bash
# 1. Start MySQL 8
docker compose up -d mysql

# 2. Inspect pending/applied migrations
npm run db:show

# 3. Apply every pending migration
npm run db:migrate

# 4. Revert the last applied migration
npm run db:revert
```

Expected tables after the initial migration: `users`, `refreshTokens`, `accounts`, `categories`, `movements`, `scheduledTransactions`, `scheduledExecutions`, `periodSnapshots`, `accountPeriodBalances`, `userPreferences`, `idempotencyKeys`, `auditLogs` (plus TypeORM's `migrations` bookkeeping table).

To change the schema, add a new migration under
`apps/api/src/app/database/migrations/`, export it from `migrations/index.ts` and
register it in `TYPEORM_MIGRATIONS` (`database.config.ts`); review the generated
SQL by hand. Never edit an already released migration; add a new one instead.

## Quality checks

```bash
npx nx run-many -t lint typecheck test build -p web,api,contracts,utils
npx nx format:check
```

## Workspace

- One root `package.json` and `package-lock.json`
- Nx task graph and affected commands: `npx nx affected -t lint typecheck test build --base=origin/main`
