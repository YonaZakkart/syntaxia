import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnvFile } from 'node:process';

/**
 * Load the repository .env file for local development.
 *
 * Variables already present in the environment always take precedence
 * (loadEnvFile never overrides them), so production deployments keep
 * using their injected configuration.
 */
function loadLocalEnv(): void {
  const candidates = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '../../.env'),
  ];

  for (const file of candidates) {
    if (existsSync(file)) {
      loadEnvFile(file);
      return;
    }
  }
}

loadLocalEnv();
