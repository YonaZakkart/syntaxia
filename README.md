# Syntaxia

**Current version**: `0.4.0` — backend complete, frontend at Phase 1.

AI-powered coding practice platform and online judge. Solve challenges in the
browser, run code against public tests, and submit solutions for grading in an
isolated Docker sandbox.

## Features

- Coding challenges with an integrated online judge
- Secure code execution sandbox (Docker, no network, resource limits)
- "Run Code" against public test cases without polluting submission history
- JWT authentication with rotating refresh tokens
- Submission history with per-test results
- Seed data for languages and challenges (idempotent)

## Tech stack

- **Monorepo**: pnpm workspaces
- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- **API**: Node.js, TypeScript, Hono, Zod, Prisma
- **Database**: PostgreSQL 16
- **Queue / cache**: Redis 7 + BullMQ 6
- **Execution**: Docker sandbox via dockerode
- **Tooling**: Biome (lint + format), TypeScript, GitHub Actions

## Requirements

- Node.js >= 20.12
- pnpm >= 10
- Docker (for PostgreSQL, Redis and the execution sandbox)

## Quick start

```bash
# 1. Install dependencies
pnpm install

# 2. Configure the environment
cp .env.example .env
# Edit .env and set a real JWT_SECRET:
#   openssl rand -base64 64

# 3. Start PostgreSQL (:5433) and Redis (:6379)
pnpm dev:infra

# 4. Create the schema and load seed data
pnpm db:push
pnpm db:seed

# 5. Run the frontend (http://localhost:3000), API (http://localhost:3001)
#    and the execution worker
pnpm dev
```

The database scripts load the root `.env` automatically, so no per-package env
file or symlink is needed. Environment variables already injected by the host
take precedence over `.env`.

For the worker only:

```bash
pnpm dev:worker
```

## Quality checks

```bash
pnpm lint     # Biome (lint + format check, no type-check)
pnpm build    # tsc across all workspaces (type-check + emit)
pnpm test     # API + worker unit tests
pnpm audit    # dependency vulnerabilities
```

## API overview

Base URL: `http://localhost:3001`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Health check |
| `POST` | `/api/auth/register` | Create account, returns access token + refresh cookie |
| `POST` | `/api/auth/login` | Log in |
| `POST` | `/api/auth/refresh` | Rotate refresh token |
| `POST` | `/api/auth/logout` | Revoke all refresh tokens |
| `GET` | `/api/challenges` | List challenges |
| `GET` | `/api/challenges/:id` | Challenge detail (public test cases only) |
| `POST` | `/api/submissions` | Submit code for grading |
| `GET` | `/api/submissions` | Current user's submission history |
| `GET` | `/api/submissions/:id` | Submission detail with test results |
| `POST` | `/api/executions` | Run code against public tests (ephemeral) |
| `GET` | `/api/executions/:runId` | Poll an ephemeral run |

Protected routes expect `Authorization: Bearer <access-token>`. Responses use
`{ success: true, data }` or `{ success: false, error, details? }`.

## Architecture

```
apps/web ──▶ apps/api ──▶ PostgreSQL
                 │
                 ├── BullMQ ──▶ Redis ──▶ services/worker ──▶ Docker sandbox
                 └── rate limit + ephemeral run state in Redis
```

See [docs/architecture.md](docs/architecture.md) for request flows, execution
limits, sandbox isolation, the data model and operational notes.

## Frontend

`apps/web` is currently at **Phase 1**: Next.js App Router, strict TypeScript,
Tailwind CSS and the public landing page. Auth UI, challenge browsing, the
Monaco editor and submission views arrive in the following branches. The web
app reads `NEXT_PUBLIC_API_URL` (see `apps/web/.env.example`).

## Status

| Area | State |
|------|-------|
| API, auth, queue, worker, sandbox | Complete |
| Challenge and submission endpoints | Complete |
| Frontend | Phase 1 (landing) |
| MVP target | `1.0.0` |

The next milestones are the application shell and auth UI (`0.5.0`), challenge
browsing and the editor (`0.6.0`), results and submission history (`0.7.0`),
hardening (`0.8.0`), production readiness (`0.9.0`) and the MVP release
(`1.0.0`).

## Project structure

```
apps/web/          Next.js frontend (port 3000)
apps/api/          Hono API (port 3001)
services/worker/   BullMQ consumer + Docker sandbox
packages/db/       Prisma schema, client and seed script
docs/              Public documentation
```

## Security

- `JWT_SECRET` is required; the API fails fast if it is missing.
- Access tokens last 15 minutes; refresh tokens last 7 days and rotate on every
  use. Reuse revokes all sessions for that user.
- User code runs in disposable containers with no network, a non-root user,
  dropped capabilities and time/memory/output limits.
- Set `NODE_ENV=production` behind TLS so the refresh cookie is sent as
  `Secure`.

## License

MIT
