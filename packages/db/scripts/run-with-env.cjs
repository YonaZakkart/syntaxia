#!/usr/bin/env node
/**
 * Run a CLI command with the repository root .env loaded.
 *
 * Prisma only reads .env from the directory where it runs (packages/db), so a
 * clean clone would fail `pnpm db:push` without a local symlink. This wrapper
 * loads the root .env (without overriding injected variables) before spawning
 * the command.
 */
const { spawnSync } = require('node:child_process');
const { existsSync } = require('node:fs');
const { resolve } = require('node:path');

const rootEnv = resolve(__dirname, '../../../.env');
if (existsSync(rootEnv)) {
  process.loadEnvFile(rootEnv);
}

const [command, ...args] = process.argv.slice(2);
if (!command) {
  console.error('Usage: node scripts/run-with-env.cjs <command> [...args]');
  process.exit(1);
}

const result = spawnSync(command, args, {
  stdio: 'inherit',
  env: process.env,
  shell: process.platform === 'win32',
});

if (result.error) {
  console.error(`Failed to run ${command}:`, result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
