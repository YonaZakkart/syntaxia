import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { unlinkSync, writeFileSync } from 'node:fs';
import { type TestContext, describe, it } from 'node:test';
import type { TestCase } from '@syntaxia/db';
import Docker from 'dockerode';
import { LANGUAGE_CONFIGS, executeInSandbox } from './docker-sandbox';
import { runTests } from './test-runner';

const PYTHON_IMAGE = 'python:3.11-slim';
const MEMORY_LIMIT_BYTES = 256 * 1024 * 1024;
const OUTPUT_LIMIT_BYTES = 64 * 1024;

const docker = new Docker();
let dockerReady: Promise<boolean> | null = null;

function isDockerAvailable(): Promise<boolean> {
  dockerReady ??= docker
    .ping()
    .then(() => true)
    .catch(() => false);

  return dockerReady;
}

async function withDocker(
  t: TestContext,
  run: () => Promise<void>
): Promise<void> {
  if (!(await isDockerAvailable())) {
    t.skip('Docker is not available');
    return;
  }

  await run();
}

function testCase(id: string): TestCase {
  return {
    id,
    challengeId: 'challenge-1',
    input: '',
    expectedOutput: 'unused',
    isPublic: false,
  };
}

describe('sandbox hardening', () => {
  it('keeps fixed, path-safe source file names', () => {
    for (const [language, config] of Object.entries(LANGUAGE_CONFIGS)) {
      assert.match(config.fileName, /^[A-Za-z0-9._-]+$/, language);
      assert.equal(config.fileName.includes('..'), false, language);
      assert.equal(config.fileName.includes('/'), false, language);
    }
  });

  it('fails with RUNTIME_ERROR when the output cap is exceeded', async (t) => {
    await withDocker(t, async () => {
      const result = await runTests({
        code: 'import sys\nsys.stdout.write("x" * (2 * 1024 * 1024))',
        language: { name: 'Python', dockerImage: PYTHON_IMAGE },
        testCases: [testCase('tc-output')],
        limits: {
          timeLimitMs: 5000,
          memoryLimitMb: 256,
          outputLimitBytes: OUTPUT_LIMIT_BYTES,
        },
      });

      assert.equal(result.finalStatus, 'RUNTIME_ERROR');
      assert.equal(result.errorMessage, 'Output limit exceeded');
    });
  });

  it('fails with TIME_LIMIT_EXCEEDED on an infinite loop', async (t) => {
    await withDocker(t, async () => {
      const result = await runTests({
        code: 'while True:\n    pass',
        language: { name: 'Python', dockerImage: PYTHON_IMAGE },
        testCases: [testCase('tc-timeout')],
        limits: {
          timeLimitMs: 1000,
          memoryLimitMb: 256,
          outputLimitBytes: OUTPUT_LIMIT_BYTES,
        },
      });

      assert.equal(result.finalStatus, 'TIME_LIMIT_EXCEEDED');
    });
  });

  it('cannot read a host-only file from the container', async (t) => {
    await withDocker(t, async () => {
      const markerPath = `/tmp/syntaxia-host-marker-${randomUUID()}`;
      writeFileSync(markerPath, 'HOST-ONLY');

      try {
        const result = await executeInSandbox(
          [
            'try:',
            `    print(open(${JSON.stringify(markerPath)}).read())`,
            'except Exception as error:',
            '    print(type(error).__name__, error)',
          ].join('\n'),
          'Python',
          PYTHON_IMAGE,
          {
            timeoutMs: 3000,
            memoryLimitBytes: MEMORY_LIMIT_BYTES,
            outputLimitBytes: OUTPUT_LIMIT_BYTES,
          }
        );

        assert.equal(result.exitCode, 0);
        assert.match(result.stdout, /FileNotFoundError/);
        assert.doesNotMatch(result.stdout, /HOST-ONLY/);
      } finally {
        unlinkSync(markerPath);
      }
    });
  });

  it('has no network access', async (t) => {
    await withDocker(t, async () => {
      const result = await executeInSandbox(
        [
          'import socket',
          'results = []',
          'try:',
          "    socket.create_connection(('1.1.1.1', 80), timeout=2)",
          "    results.append('CONNECTED')",
          'except Exception as error:',
          '    results.append(type(error).__name__)',
          'try:',
          "    socket.getaddrinfo('example.com', 80)",
          "    results.append('RESOLVED')",
          'except Exception as error:',
          '    results.append(type(error).__name__)',
          "print(','.join(results))",
        ].join('\n'),
        'Python',
        PYTHON_IMAGE,
        {
          timeoutMs: 5000,
          memoryLimitBytes: MEMORY_LIMIT_BYTES,
          outputLimitBytes: OUTPUT_LIMIT_BYTES,
        }
      );

      assert.equal(result.exitCode, 0);
      assert.match(result.stdout, /OSError|TimeoutError/);
      assert.match(result.stdout, /gaierror/);
      assert.doesNotMatch(result.stdout, /CONNECTED/);
      assert.doesNotMatch(result.stdout, /RESOLVED/);
    });
  });
});
