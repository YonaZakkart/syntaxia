import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(appRoot, 'node_modules/monaco-editor/min/vs');
const target = resolve(appRoot, 'public/monaco/vs');

if (!existsSync(source)) {
  console.warn('[monaco] monaco-editor is not installed; skipping asset copy');
  process.exit(0);
}

rmSync(target, { recursive: true, force: true });
mkdirSync(dirname(target), { recursive: true });
cpSync(source, target, { recursive: true });
console.log('[monaco] copied assets to public/monaco/vs');
