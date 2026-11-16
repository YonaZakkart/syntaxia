import type { Language, Submission, TestCase } from '@syntaxia/db';
import {
  type ExecutionResult,
  type SandboxRunOptions,
  executeInSandbox,
} from './docker-sandbox';
import { type ExecutionLimits, GLOBAL_DEFAULT_LIMITS } from './limits';

export type SandboxExecutor = (
  code: string,
  languageName: string,
  dockerImage: string,
  options?: SandboxRunOptions
) => Promise<ExecutionResult>;

interface TestRunnerInput {
  submission: Submission & {
    challenge: {
      testCases: TestCase[];
    };
    language: Language;
  };
  limits?: ExecutionLimits;
}

export interface TestResult {
  testCaseId: string;
  passed: boolean;
  expectedOutput: string;
  actualOutput: string;
  error?: string;
  duration: number;
}

export type TestRunnerStatus =
  | 'PASSED'
  | 'WRONG_ANSWER'
  | 'TIME_LIMIT_EXCEEDED'
  | 'MEMORY_LIMIT_EXCEEDED'
  | 'RUNTIME_ERROR'
  | 'COMPILATION_ERROR'
  | 'SYSTEM_ERROR';

export interface TestRunnerResult {
  finalStatus: TestRunnerStatus;
  testsPassed: number;
  testsTotal: number;
  failedTestCaseId?: string;
  errorMessage?: string;
  totalDuration: number;
  testResults: TestResult[];
}

// The `timeout` command exits with 124 when it kills the child process.
const TIMEOUT_EXIT_CODE = 124;
// 128 + SIGKILL (9), typically the OOM killer inside the container.
const SIGKILL_EXIT_CODE = 137;

function normalizeOutput(output: string): string {
  return output.replace(/\r\n/g, '\n').trim();
}

export async function runTests(
  { submission, limits = GLOBAL_DEFAULT_LIMITS }: TestRunnerInput,
  execute: SandboxExecutor = executeInSandbox
): Promise<TestRunnerResult> {
  const { code, language, challenge } = submission;
  const testCases = challenge.testCases;

  if (testCases.length === 0) {
    return {
      finalStatus: 'SYSTEM_ERROR',
      testsPassed: 0,
      testsTotal: 0,
      errorMessage: 'No test cases found for this challenge',
      totalDuration: 0,
      testResults: [],
    };
  }

  const startTime = Date.now();
  const testResults: TestResult[] = [];
  let testsPassed = 0;
  let failedTestCaseId: string | undefined;
  let errorMessage: string | undefined;
  let failureStatus: TestRunnerStatus | undefined;

  const fail = (
    testCase: TestCase,
    status: TestRunnerStatus,
    actualOutput: string,
    duration: number,
    message: string,
    error?: string
  ) => {
    testResults.push({
      testCaseId: testCase.id,
      passed: false,
      expectedOutput: normalizeOutput(testCase.expectedOutput),
      actualOutput,
      error,
      duration,
    });
    failedTestCaseId = testCase.id;
    errorMessage = message;
    failureStatus = status;
  };

  for (const testCase of testCases) {
    const testStartTime = Date.now();

    try {
      const result = await execute(code, language.name, language.dockerImage, {
        timeoutMs: limits.timeLimitMs,
        stdinInput: testCase.input,
        memoryLimitBytes: limits.memoryLimitMb * 1024 * 1024,
        outputLimitBytes: limits.outputLimitBytes,
      });

      const testDuration = Date.now() - testStartTime;
      const actualOutput = normalizeOutput(result.stdout);
      const expectedOutput = normalizeOutput(testCase.expectedOutput);

      if (result.systemError) {
        fail(
          testCase,
          'SYSTEM_ERROR',
          actualOutput,
          testDuration,
          result.stderr || 'Sandbox execution failed',
          'SYSTEM_ERROR'
        );
        break;
      }

      if (result.compilationFailed) {
        fail(
          testCase,
          'COMPILATION_ERROR',
          actualOutput,
          testDuration,
          result.stderr || 'Compilation failed',
          'COMPILATION_ERROR'
        );
        break;
      }

      if (result.exitCode === TIMEOUT_EXIT_CODE) {
        fail(
          testCase,
          'TIME_LIMIT_EXCEEDED',
          actualOutput,
          testDuration,
          'Execution timed out',
          'TIME_LIMIT_EXCEEDED'
        );
        break;
      }

      if (result.exitCode === SIGKILL_EXIT_CODE) {
        fail(
          testCase,
          'MEMORY_LIMIT_EXCEEDED',
          actualOutput,
          testDuration,
          'Memory limit exceeded',
          'MEMORY_LIMIT_EXCEEDED'
        );
        break;
      }

      if (result.exitCode !== 0) {
        fail(
          testCase,
          'RUNTIME_ERROR',
          actualOutput,
          testDuration,
          result.stderr || 'Execution failed',
          'RUNTIME_ERROR'
        );
        break;
      }

      if (result.outputTruncated) {
        fail(
          testCase,
          'RUNTIME_ERROR',
          actualOutput,
          testDuration,
          'Output limit exceeded',
          'RUNTIME_ERROR'
        );
        break;
      }

      if (actualOutput !== expectedOutput) {
        fail(
          testCase,
          'WRONG_ANSWER',
          actualOutput,
          testDuration,
          'Wrong answer'
        );
        break;
      }

      testsPassed++;
      testResults.push({
        testCaseId: testCase.id,
        passed: true,
        expectedOutput,
        actualOutput,
        duration: testDuration,
      });
    } catch (error) {
      fail(
        testCase,
        'SYSTEM_ERROR',
        '',
        Date.now() - testStartTime,
        error instanceof Error ? error.message : 'Unknown error',
        'SYSTEM_ERROR'
      );
      break;
    }
  }

  return {
    finalStatus:
      failureStatus ??
      (testsPassed === testCases.length ? 'PASSED' : 'SYSTEM_ERROR'),
    testsPassed,
    testsTotal: testCases.length,
    failedTestCaseId,
    errorMessage,
    totalDuration: Date.now() - startTime,
    testResults,
  };
}
