import type { Language, Submission, TestCase } from '@syntaxia/db';
import { executeInSandbox } from './docker-sandbox';

interface TestRunnerInput {
  submission: Submission & {
    challenge: {
      testCases: TestCase[];
    };
    language: Language;
  };
}

interface TestResult {
  testCaseId: string;
  passed: boolean;
  expectedOutput: string;
  actualOutput: string;
  error?: string;
  duration: number;
}

interface TestRunnerResult {
  finalStatus:
    | 'PASSED'
    | 'WRONG_ANSWER'
    | 'TIME_LIMIT_EXCEEDED'
    | 'RUNTIME_ERROR'
    | 'COMPILATION_ERROR'
    | 'SYSTEM_ERROR';
  testsPassed: number;
  testsTotal: number;
  failedTestCaseId?: string;
  errorMessage?: string;
  totalDuration: number;
  testResults: TestResult[];
}

export async function runTests({
  submission,
}: TestRunnerInput): Promise<TestRunnerResult> {
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

  // Ejecutar cada test case
  for (const testCase of testCases) {
    const testStartTime = Date.now();

    try {
      const result = await executeInSandbox(
        code,
        language.name,
        language.dockerImage,
        5000, // 5 segundos timeout por test
        testCase.input
      );

      const testDuration = Date.now() - testStartTime;
      const actualOutput = result.stdout.trim();
      const expectedOutput = testCase.expectedOutput.trim();

      // Detectar tipo de error
      if (result.exitCode === 124) {
        // Timeout (exit code `timeout` de Linux)
        testResults.push({
          testCaseId: testCase.id,
          passed: false,
          expectedOutput,
          actualOutput,
          error: 'TIME_LIMIT_EXCEEDED',
          duration: testDuration,
        });
        failedTestCaseId = testCase.id;
        errorMessage = 'Execution timed out';
        break; // Detener ejecución en primer timeout
      }

      if (result.exitCode !== 0) {
        // Error de compilación o runtime
        const errorType = result.stderr.toLowerCase().includes('error')
          ? 'COMPILATION_ERROR'
          : 'RUNTIME_ERROR';

        testResults.push({
          testCaseId: testCase.id,
          passed: false,
          expectedOutput,
          actualOutput,
          error: errorType,
          duration: testDuration,
        });
        failedTestCaseId = testCase.id;
        errorMessage = result.stderr || 'Execution failed';
        break; // Detener ejecución en primer error
      }

      if (actualOutput !== expectedOutput) {
        // Output incorrecto
        testResults.push({
          testCaseId: testCase.id,
          passed: false,
          expectedOutput,
          actualOutput,
          duration: testDuration,
        });
        failedTestCaseId = testCase.id;
        errorMessage = 'Wrong answer';
        break; // Detener ejecución en primer test fallido
      }

      // Si llegamos aquí, el test pasó
      testsPassed++;
      testResults.push({
        testCaseId: testCase.id,
        passed: true,
        expectedOutput,
        actualOutput,
        duration: testDuration,
      });
    } catch (error) {
      const testDuration = Date.now() - testStartTime;
      testResults.push({
        testCaseId: testCase.id,
        passed: false,
        expectedOutput: testCase.expectedOutput.trim(),
        actualOutput: '',
        error: 'SYSTEM_ERROR',
        duration: testDuration,
      });
      failedTestCaseId = testCase.id;
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      break;
    }
  }

  const totalDuration = Date.now() - startTime;

  // Determinar estado final
  let finalStatus: TestRunnerResult['finalStatus'];

  if (testsPassed === testCases.length) {
    finalStatus = 'PASSED';
  } else if (errorMessage === 'TIME_LIMIT_EXCEEDED') {
    finalStatus = 'TIME_LIMIT_EXCEEDED';
  } else if (errorMessage === 'COMPILATION_ERROR') {
    finalStatus = 'COMPILATION_ERROR';
  } else if (errorMessage === 'RUNTIME_ERROR') {
    finalStatus = 'RUNTIME_ERROR';
  } else if (errorMessage === 'Wrong answer') {
    finalStatus = 'WRONG_ANSWER';
  } else {
    finalStatus = 'SYSTEM_ERROR';
  }

  return {
    finalStatus,
    testsPassed,
    testsTotal: testCases.length,
    failedTestCaseId,
    errorMessage,
    totalDuration,
    testResults,
  };
}
