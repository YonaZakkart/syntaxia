import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ExecutionResult } from './docker-sandbox';
import { type SandboxExecutor, runTests } from './test-runner';

interface Case {
  input: string;
  expectedOutput: string;
}

function buildSubmission(code: string, cases: Case[]) {
  return {
    id: 'submission-1',
    userId: 'user-1',
    challengeId: 'challenge-1',
    languageId: 'language-1',
    code,
    status: 'QUEUED',
    createdAt: new Date(),
    challenge: {
      testCases: cases.map((testCase, index) => ({
        id: `tc-${index}`,
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        challengeId: 'challenge-1',
        isPublic: false,
      })),
    },
    language: {
      id: 'language-1',
      name: 'Python',
      version: '3.11',
      dockerImage: 'python:3.11-slim',
      createdAt: new Date(),
    },
  } as unknown as Parameters<typeof runTests>[0]['submission'];
}

function executorFrom(
  perInput: Record<string, ExecutionResult | Error>
): SandboxExecutor {
  return async (_code, _language, _image, _timeout, stdinInput) => {
    const fixture = perInput[String(stdinInput)];

    if (!fixture) {
      throw new Error(`No fixture for input: ${String(stdinInput)}`);
    }

    if (fixture instanceof Error) {
      throw fixture;
    }

    return fixture;
  };
}

const success = (stdout: string): ExecutionResult => ({
  stdout,
  stderr: '',
  exitCode: 0,
  duration: 1,
});

const twoCases: Case[] = [
  { input: 'first', expectedOutput: 'ok' },
  { input: 'second', expectedOutput: 'ok' },
];

describe('runTests', () => {
  it('passes when every test case matches', async () => {
    const result = await runTests(
      {
        submission: buildSubmission('code', twoCases),
      },
      executorFrom({
        first: success('ok\n'),
        second: success('ok\n'),
      })
    );

    assert.equal(result.finalStatus, 'PASSED');
    assert.equal(result.testsPassed, 2);
    assert.equal(result.testsTotal, 2);
    assert.equal(
      result.testResults.every((test) => test.passed),
      true
    );
  });

  it('reports WRONG_ANSWER when a later test case differs', async () => {
    const result = await runTests(
      { submission: buildSubmission('code', twoCases) },
      executorFrom({
        first: success('ok\n'),
        second: success('nope\n'),
      })
    );

    assert.equal(result.finalStatus, 'WRONG_ANSWER');
    assert.equal(result.testsPassed, 1);
    assert.equal(result.failedTestCaseId, 'tc-1');
  });

  it('reports RUNTIME_ERROR after a passing test (regression)', async () => {
    const result = await runTests(
      { submission: buildSubmission('code', twoCases) },
      executorFrom({
        first: success('ok\n'),
        second: {
          stdout: '',
          stderr: 'ValueError: boom',
          exitCode: 1,
          duration: 1,
        },
      })
    );

    assert.equal(result.finalStatus, 'RUNTIME_ERROR');
    assert.equal(result.testsPassed, 1);
    assert.equal(result.testResults[1]?.error, 'RUNTIME_ERROR');
  });

  it('reports COMPILATION_ERROR when the sandbox flags a compile failure', async () => {
    const result = await runTests(
      { submission: buildSubmission('code', twoCases) },
      executorFrom({
        first: success('ok\n'),
        second: {
          stdout: '',
          stderr: "error: 'x' was not declared",
          exitCode: 1,
          duration: 1,
          compilationFailed: true,
        },
      })
    );

    assert.equal(result.finalStatus, 'COMPILATION_ERROR');
    assert.equal(result.testResults[1]?.error, 'COMPILATION_ERROR');
  });

  it('reports TIME_LIMIT_EXCEEDED for exit code 124', async () => {
    const result = await runTests(
      { submission: buildSubmission('code', twoCases) },
      executorFrom({
        first: { stdout: '', stderr: '', exitCode: 124, duration: 1 },
        second: success('ok\n'),
      })
    );

    assert.equal(result.finalStatus, 'TIME_LIMIT_EXCEEDED');
    assert.equal(result.failedTestCaseId, 'tc-0');
  });

  it('reports MEMORY_LIMIT_EXCEEDED for SIGKILL exit code 137', async () => {
    const result = await runTests(
      { submission: buildSubmission('code', twoCases) },
      executorFrom({
        first: { stdout: '', stderr: '', exitCode: 137, duration: 1 },
        second: success('ok\n'),
      })
    );

    assert.equal(result.finalStatus, 'MEMORY_LIMIT_EXCEEDED');
  });

  it('reports SYSTEM_ERROR when the sandbox itself fails', async () => {
    const result = await runTests(
      { submission: buildSubmission('code', twoCases) },
      executorFrom({
        first: {
          stdout: '',
          stderr: 'Cannot connect to Docker',
          exitCode: -1,
          duration: 1,
          systemError: true,
        },
        second: success('ok\n'),
      })
    );

    assert.equal(result.finalStatus, 'SYSTEM_ERROR');
  });

  it('reports SYSTEM_ERROR when the executor throws', async () => {
    const result = await runTests(
      { submission: buildSubmission('code', twoCases) },
      executorFrom({ first: new Error('boom') })
    );

    assert.equal(result.finalStatus, 'SYSTEM_ERROR');
    assert.equal(result.errorMessage, 'boom');
  });

  it('reports RUNTIME_ERROR when the output exceeds the limit', async () => {
    const result = await runTests(
      {
        submission: buildSubmission('code', [
          { input: 'first', expectedOutput: 'ok' },
        ]),
      },
      executorFrom({
        first: {
          stdout: 'x'.repeat(10),
          stderr: '',
          exitCode: 0,
          duration: 1,
          outputTruncated: true,
        },
      })
    );

    assert.equal(result.finalStatus, 'RUNTIME_ERROR');
    assert.equal(result.errorMessage, 'Output limit exceeded');
  });

  it('normalizes CRLF line endings before comparing', async () => {
    const result = await runTests(
      {
        submission: buildSubmission('code', [
          { input: 'first', expectedOutput: 'a\r\nb' },
        ]),
      },
      executorFrom({ first: success('a\nb\n') })
    );

    assert.equal(result.finalStatus, 'PASSED');
  });

  it('stops executing after the first failure', async () => {
    let calls = 0;
    const executor: SandboxExecutor = async () => {
      calls++;
      return success('wrong\n');
    };

    const result = await runTests(
      { submission: buildSubmission('code', twoCases) },
      executor
    );

    assert.equal(result.finalStatus, 'WRONG_ANSWER');
    assert.equal(calls, 1);
    assert.equal(result.testResults.length, 1);
  });

  it('reports SYSTEM_ERROR when the challenge has no test cases', async () => {
    const result = await runTests(
      { submission: buildSubmission('code', []) },
      executorFrom({})
    );

    assert.equal(result.finalStatus, 'SYSTEM_ERROR');
    assert.equal(result.testsTotal, 0);
  });
});
