# Architecture

Syntaxia is a pnpm monorepo with three deployable workspaces:

| Workspace | Role |
|-----------|------|
| `apps/web` | Next.js App Router frontend (default port `3000`) |
| `apps/api` | Hono HTTP API (default port `3001`) |
| `services/worker` | BullMQ consumer that executes code in Docker sandboxes |
| `packages/db` | Prisma schema, generated client and seed script |

PostgreSQL stores users, challenges and submissions. Redis backs the BullMQ
queue, rate limiting and the ephemeral "Run Code" state. User code never runs
inside the API process: every execution happens in a disposable Docker
container managed by the worker.

```
Browser ──HTTP──▶ Web (Next.js) ──HTTP──▶ API (Hono) ──SQL──▶ PostgreSQL
                                             │
                                             ├── BullMQ ──▶ Redis
                                             │                 ▲
                                             ▼                 │
                                        Worker ──dockerode──▶ Docker sandbox
                                             │                 │
                                             └──results────────┘
```

The frontend is at Phase 3: landing, responsive app shell and authentication UI.
The browser calls relative `/api/*` paths and Next.js proxies them to the API, so
the HttpOnly refresh cookie stays same-origin. The access token is kept in
memory and restored with the refresh cookie on reload. Challenge browsing and
the editor are added in later phases.

## Main flows

### 1. Submission (persisted)

1. `POST /api/submissions` validates the JWT, the challenge and the language,
   creates a `Submission` with status `QUEUED`, then enqueues an
   `execute-code` job.
2. The worker marks it `RUNNING`, loads the challenge, language and **all** test
   cases, and resolves the execution limits.
3. Each test case runs sequentially in a fresh sandbox. Execution stops at the
   first failure.
4. The worker atomically updates `Submission.status` and upserts the `Execution`
   row with per-test results.

The client polls `GET /api/submissions/:id` until the status is final. Private
test-case payloads are redacted for non-admin users.

### 2. Run Code (ephemeral)

1. `POST /api/executions` validates the same inputs and requires at least one
   public test case. It stores `{status: QUEUED}` in Redis under
   `execution:run:<runId>` (TTL 5 minutes) and enqueues a `run-code` job.
2. The worker loads **only public** test cases, executes them with the same
   sandbox and limits, and writes `RUNNING` / `FINISHED` plus results back to
   Redis.
3. No `Submission` or `Execution` row is created: runs do not count for history,
   ranking or XP.
4. The client polls `GET /api/executions/:runId`. The owner or an admin can read
   the run; missing/expired runs return `404`.

### 3. Authentication

- Access token: JWT HS256, 15 minutes, sent as `Authorization: Bearer <token>`.
- Refresh token: 7 days, opaque JWT stored as a bcrypt hash, delivered in an
  HttpOnly `SameSite=Strict` cookie scoped to `/api/auth/refresh`.
- Every refresh rotates the token and revokes the stored row. Reusing a revoked
  token revokes all sessions for that user.
- `JWT_SECRET` is mandatory. The API fails fast at startup if it is missing.

## Frontend

`apps/web` uses the Next.js App Router with strict TypeScript, React Server
Components and Tailwind CSS 4. It is built with Turbopack and linted by the same
root Biome configuration as the backend (no ESLint).

Current scope (Phase 3) is the landing, the responsive app shell and the
authentication UI. Route groups are `(auth)` for login/register and `(app)` for
the protected challenges, submissions and profile routes. `/api/*` is rewritten
to the API so the refresh cookie remains same-origin.

### Web authentication

1. `POST /api/auth/register` or `POST /api/auth/login` returns a short-lived
   access token and sets the rotating `refreshToken` cookie (`HttpOnly`,
   `SameSite=Strict`, path `/api/auth/refresh`).
2. The access token lives only in memory; the user object is cached in
   `localStorage` for display, never for authorization.
3. On reload, `AuthProvider` calls `/api/auth/refresh`; the cookie is sent to the
   same origin through the Next.js proxy and the session is restored.
4. Concurrent refreshes share one request, and an API response with
   `TOKEN_EXPIRED` triggers one refresh and a retry.
5. `ProtectedShell` redirects guests to `/login`; logout revokes the session and
   clears the cookie.

Environment variables (`apps/web/.env.example`):

| Variable | Purpose |
|----------|---------|
| `API_URL` | Server-side API origin used by the Next.js rewrite (`http://localhost:3001`) |
| `NEXT_PUBLIC_API_URL` | Backend base URL for direct browser calls when needed |
| `NEXT_PUBLIC_WS_URL` | Reserved for future real-time transports |

`pnpm dev` starts the web app on `:3000`, the API on `:3001` and the worker.

## Execution limits

Limits are resolved as **challenge override > language default > global
default**, then clamped to safe ranges:

| Limit | Global default | Range |
|-------|----------------|-------|
| Time | 5000 ms | 100–60000 ms |
| Memory | 256 MB | 32–2048 MB |
| Output | 1 MB per stream | 1 KB–10 MB |

Language defaults can differ (for example Java uses 512 MB for the JVM).

## Sandbox isolation

Each run gets a dedicated container with:

- `NetworkMode: none` (no network or DNS)
- non-root user `65534:65534`
- all capabilities dropped and `no-new-privileges`
- 1 CPU and `PidsLimit: 64`
- `MemorySwap` equal to the memory limit (no swap headroom)
- a 10-second compilation timeout and a configurable run timeout
- output capped per stream; exceeding the cap fails the test
- manual `stop` + `remove` in a `finally` block

Source files and stdin are written through tar archives (`putArchive`), so user
code never reaches a shell as an argument.

## API overview

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/` | No | Health check |
| `POST` | `/api/auth/register` | No | Create account + token pair |
| `POST` | `/api/auth/login` | No | Authenticate + token pair |
| `POST` | `/api/auth/refresh` | Cookie/body | Rotate refresh token |
| `POST` | `/api/auth/logout` | Bearer | Revoke all refresh tokens |
| `GET` | `/api/challenges` | No | List challenges |
| `GET` | `/api/challenges/:id` | No | Challenge detail (public tests only) |
| `POST` | `/api/submissions` | Bearer | Submit code for grading |
| `GET` | `/api/submissions` | Bearer | Current user's submission history |
| `GET` | `/api/submissions/:id` | Bearer | Submission detail + test results |
| `POST` | `/api/executions` | Bearer | Run code against public tests |
| `GET` | `/api/executions/:runId` | Bearer | Poll an ephemeral run |

All responses use `{ success: true, data }` or
`{ success: false, error, details? }`.

Rate limiting uses Redis and returns `429` with `Retry-After` headers:

| Scope | Limit |
|-------|-------|
| Global | 100 req/min per IP |
| Register | 5 / 15 min |
| Login | 10 / 15 min |
| Refresh | 5 / 15 min |
| Submissions | 30 / min |
| Run Code | 30 / min per user (shared bucket with submissions) |

## Data model

| Table | Purpose |
|-------|---------|
| `User` | Account, bcrypt password, role (`USER`/`ADMIN`) |
| `RefreshToken` | Hashed rotating refresh tokens |
| `Language` | Runtime name, Docker image, default limits |
| `Challenge` | Statement, starter code, language, optional limit overrides |
| `TestCase` | Input/expected output, `isPublic` flag |
| `Submission` | Persisted code submission and final status |
| `Execution` | 1:1 with a submission: counters and per-test JSON results |

## Operations

### Environment

Copy `.env.example` to `.env` and set at least `DATABASE_URL`, `REDIS_URL` and
`JWT_SECRET`. Generate a production secret with:

```bash
openssl rand -base64 64
```

`PORT` is optional (default `3001`). Injected environment variables always win
over `.env`, so production deployments can ignore the file.

### Local infrastructure

```bash
pnpm dev:infra      # PostgreSQL :5433 + Redis :6379
pnpm db:push        # sync schema (development)
pnpm db:seed        # languages + challenges (idempotent)
pnpm dev            # API + worker in watch mode
```

### Database scripts

The `packages/db` scripts load the repository root `.env` themselves, so they
work from a clean clone without a per-package env file or symlink. Production
should switch from `db push` to versioned Prisma migrations before release.

### Refresh-token cleanup

Expired rows are safe to delete. `cleanupRefreshTokens()` in
`apps/api/src/lib/refreshToken.ts` removes rows whose `expiresAt` is in the
past, but it is not scheduled yet; run it from a cron/systemd timer or a future
maintenance job. Revoked-but-unexpired rows are intentionally kept so replaying
an old token can still be detected.

### Scaling

The API is stateless apart from Redis and PostgreSQL, so it can be replicated.
Workers can also be scaled horizontally: BullMQ distributes jobs, and each
execution gets its own container. Size the host for the number of concurrent
sandboxes (each uses at most the configured CPU and memory limits).

## Security notes

- Never execute user code outside the sandbox.
- Keep `JWT_SECRET` out of source control; rotate it to invalidate all sessions.
- Use a shared Redis instance in production so rate limits span API replicas.
- Put the API behind TLS; the refresh cookie becomes `Secure` when
  `NODE_ENV=production`.
- The sandbox blocks network access but is not a complete adversarial hardening
  boundary yet; see the security roadmap before exposing execution to untrusted
  internet traffic at scale.
