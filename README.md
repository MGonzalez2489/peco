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

## Run with Docker

All Docker commands below must be run from the repository root. Compose uses `docker-compose.yml` and reads variables from `.env` when present (you can start from `.env.example`).

Optional ports/credentials (defaults shown):

- `DB_PORT=3306`, `DB_NAME=peco`, `DB_USER=peco`, `DB_PASSWORD=peco`, `DB_ROOT_PASSWORD=root`
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

- **Image/build:** `apps/api/Dockerfile` (multi-stage: `npm ci` + `nx run api:build:production`, runs `node main.js`)
- **Runtime env:** `PORT`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_LOGGING` (Compose sets `DB_HOST=mysql` and waits for MySQL health)
- **Ports:** `http://localhost:3000` (`/api`, `/health`)

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

## Quality checks

```bash
npx nx run-many -t lint typecheck test build -p web,api,contracts,utils
npx nx format:check
```

## Workspace

- One root `package.json` and `package-lock.json`
- Nx task graph and affected commands: `npx nx affected -t lint typecheck test build --base=origin/main`
