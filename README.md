# Syntaxia

AI-powered coding practice platform and online judge.

## Features
- Coding Challenges with an integrated Online Judge
- Secure Code Execution Sandbox (Docker)
- AI Coding Mentor for hints, debugging, and explanations
- Progress tracking and gamification

## Tech Stack
- **Monorepo**: pnpm workspaces
- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: Node.js, TypeScript, Prisma, PostgreSQL
- **Execution Engine**: Redis, BullMQ, Docker Sandbox
- **Tooling**: Biome (linting & formatting), GitHub Actions

## Local Development
1. Ensure you have Node.js >= 20.12 and pnpm installed.
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Start the local infrastructure (PostgreSQL + Redis):
   ```bash
   pnpm dev:infra
   ```
4. Run the API and worker in development mode:
   ```bash
   pnpm dev
   ```
5. Run the tests and linter:
   ```bash
   pnpm test
   pnpm lint
   ```

## Architecture
See the source layout: `apps/api` (Hono API), `services/worker` (BullMQ execution
worker), and `packages/db` (Prisma schema and client).