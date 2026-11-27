import assert from 'node:assert/strict';
import { type TestContext, describe, it } from 'node:test';
import type { TestCase } from '@syntaxia/db';
import Docker from 'dockerode';
import { LANGUAGE_CONFIGS, getLanguageConfig } from './docker-sandbox';
import { runTests } from './test-runner';

const TS_IMAGE = 'syntaxia/typescript-runner';
const LIMITS = {
  timeLimitMs: 5000,
  memoryLimitMb: 256,
  outputLimitBytes: 1024 * 1024,
};

const docker = new Docker();
let imageReady: Promise<boolean> | null = null;

function isImageReady(): Promise<boolean> {
  imageReady ??= docker
    .getImage(TS_IMAGE)
    .inspect()
    .then(() => true)
    .catch(() => false);

  return imageReady;
}

async function withImage(
  t: TestContext,
  run: () => Promise<void>
): Promise<void> {
  if (!(await isImageReady())) {
    t.skip(`${TS_IMAGE} is not available`);
    return;
  }

  await run();
}

function testCase(id: string, input: string, expectedOutput: string): TestCase {
  return {
    id,
    challengeId: 'challenge-ts',
    input,
    expectedOutput,
    isPublic: true,
  };
}

describe('TypeScript sandbox', () => {
  it('maps TypeScript and ts to the tsx runner', () => {
    assert.equal(LANGUAGE_CONFIGS.typescript.fileName, 'solution.ts');
    assert.match(LANGUAGE_CONFIGS.typescript.runCommand, /tsx/);
    assert.equal(getLanguageConfig('TypeScript').fileName, 'solution.ts');
    assert.equal(getLanguageConfig('ts').fileName, 'solution.ts');
  });

  it('runs a TypeScript solution with stdin', async (t) => {
    await withImage(t, async () => {
      const result = await runTests({
        code: [
          "const input = JSON.parse(require('fs').readFileSync('/tmp/input.txt', 'utf-8'));",
          'const total: number = input.a + input.b;',
          'console.log(total);',
        ].join('\n'),
        language: { name: 'TypeScript', dockerImage: TS_IMAGE },
        testCases: [testCase('ts-ok', '{"a":2,"b":3}', '5')],
        limits: LIMITS,
      });

      assert.equal(result.finalStatus, 'PASSED');
      assert.equal(result.testsPassed, 1);
    });
  });

  it('reports a syntax error as a runtime failure', async (t) => {
    await withImage(t, async () => {
      const result = await runTests({
        code: 'const value: = 1;',
        language: { name: 'TypeScript', dockerImage: TS_IMAGE },
        testCases: [testCase('ts-bad', '{}', 'unused')],
        limits: LIMITS,
      });

      assert.equal(result.finalStatus, 'RUNTIME_ERROR');
    });
  });
});
