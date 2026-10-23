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
1. Ensure you have Node.js >= 20 and pnpm installed.
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. pnpm lint

## Architecture
See docs/architecture.md for detailed system design.