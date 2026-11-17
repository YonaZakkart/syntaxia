import './lib/env';
import { type Prisma, prisma } from '@syntaxia/db';
import { type Job, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { resolveExecutionLimits } from './lib/limits';
import { type ExecutionRunState, saveRunState } from './lib/run-store';
import { runTests } from './lib/test-runner';

const connection = new IORedis(
  process.env.REDIS_URL || 'redis://localhost:6379',
  {
    maxRetriesPerRequest: null,
  }
);

connection.on('error', (error) => {
  console.error('[worker] Redis connection error:', error.message);
});

console.log('Worker started, listening on queue "code-execution"...');

async function processSubmissionJob(job: Job) {
  const { submissionId } = job.data as { submissionId?: unknown };

  if (typeof submissionId !== 'string' || submissionId.length === 0) {
    throw new Error('Invalid job payload: submissionId is required');
  }

  console.log(`[Job ${job.id}] Processing submission: ${submissionId}`);

  try {
    // 1. Mark the submission as RUNNING
    await prisma.submission.update({
      where: { id: submissionId },
      data: { status: 'RUNNING' },
    });
    console.log(`[Job ${job.id}] Status updated to RUNNING`);

    // 2. Load the full context (submission + challenge + test cases + language)
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        challenge: {
          include: {
            testCases: true,
          },
        },
        language: true,
      },
    });

    if (!submission) {
      throw new Error('Submission not found');
    }

    console.log(
      `[Job ${job.id}] Context loaded. Language: ${submission.language.name}, Test cases: ${submission.challenge.testCases.length}`
    );

    // 3. Execute the test runner with the resolved limits
    const limits = resolveExecutionLimits(
      submission.challenge,
      submission.language
    );
    console.log(
      `[Job ${job.id}] Limits: ${limits.timeLimitMs}ms, ${limits.memoryLimitMb}MB, ${limits.outputLimitBytes}B output`
    );
    console.log(`[Job ${job.id}] Running test runner...`);

    const testResult = await runTests({
      code: submission.code,
      language: submission.language,
      testCases: submission.challenge.testCases,
      limits,
    });

    console.log(`[Job ${job.id}] Test runner result:`, {
      finalStatus: testResult.finalStatus,
      testsPassed: testResult.testsPassed,
      testsTotal: testResult.testsTotal,
      errorMessage: testResult.errorMessage,
      totalDuration: `${testResult.totalDuration}ms`,
    });

    // 4. Persist the final status and the detailed execution result
    await prisma.$transaction([
      prisma.submission.update({
        where: { id: submissionId },
        data: { status: testResult.finalStatus },
      }),
      prisma.execution.upsert({
        where: { submissionId },
        create: {
          submissionId,
          testsPassed: testResult.testsPassed,
          testsTotal: testResult.testsTotal,
          totalDurationMs: testResult.totalDuration,
          testResults:
            testResult.testResults as unknown as Prisma.InputJsonValue,
          failedTestCaseId: testResult.failedTestCaseId,
          errorMessage: testResult.errorMessage,
        },
        update: {
          testsPassed: testResult.testsPassed,
          testsTotal: testResult.testsTotal,
          totalDurationMs: testResult.totalDuration,
          testResults:
            testResult.testResults as unknown as Prisma.InputJsonValue,
          failedTestCaseId: testResult.failedTestCaseId,
          errorMessage: testResult.errorMessage,
        },
      }),
    ]);

    console.log(
      `[Job ${job.id}] Execution finished. Final status: ${testResult.finalStatus}`
    );
  } catch (error) {
    console.error(`[Job ${job.id}] Failed to process job:`, error);

    // Do not let the cleanup update mask the original error.
    await prisma.submission
      .update({
        where: { id: submissionId },
        data: { status: 'SYSTEM_ERROR' },
      })
      .catch((updateError) => {
        console.error(
          `[Job ${job.id}] Could not mark submission as SYSTEM_ERROR:`,
          updateError
        );
      });

    throw error;
  }
}

interface RunCodeJobData {
  runId?: unknown;
  userId?: unknown;
  challengeId?: unknown;
  languageId?: unknown;
  code?: unknown;
}

function requireJobString(value: unknown, field: keyof RunCodeJobData): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Invalid job payload: ${field} is required`);
  }

  return value;
}

/**
 * Ephemeral "Run Code" execution: only public test cases are graded and the
 * result is written to Redis with a TTL instead of PostgreSQL.
 */
async function processRunCodeJob(job: Job) {
  const data = job.data as RunCodeJobData;
  const runId = requireJobString(data.runId, 'runId');
  const userId = requireJobString(data.userId, 'userId');
  const challengeId = requireJobString(data.challengeId, 'challengeId');
  const languageId = requireJobString(data.languageId, 'languageId');
  const code = requireJobString(data.code, 'code');

  const startedAt = new Date().toISOString();
  const runningState: ExecutionRunState = {
    runId,
    userId,
    challengeId,
    languageId,
    status: 'RUNNING',
    createdAt: startedAt,
    startedAt,
  };

  await saveRunState(connection, runningState);
  console.log(`[Job ${job.id}] Processing run-code: ${runId}`);

  try {
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      include: {
        language: true,
        // "Run Code" never grades private test cases.
        testCases: { where: { isPublic: true } },
      },
    });

    if (!challenge) {
      throw new Error('Challenge not found');
    }

    if (challenge.languageId !== languageId) {
      throw new Error('Language does not match the challenge language');
    }

    const limits = resolveExecutionLimits(challenge, challenge.language);
    console.log(
      `[Job ${job.id}] Run limits: ${limits.timeLimitMs}ms, ${limits.memoryLimitMb}MB, ${limits.outputLimitBytes}B output (${challenge.testCases.length} public tests)`
    );

    const testResult = await runTests({
      code,
      language: challenge.language,
      testCases: challenge.testCases,
      limits,
    });

    await saveRunState(connection, {
      ...runningState,
      status: 'FINISHED',
      finishedAt: new Date().toISOString(),
      result: {
        finalStatus: testResult.finalStatus,
        testsPassed: testResult.testsPassed,
        testsTotal: testResult.testsTotal,
        totalDurationMs: testResult.totalDuration,
        testResults: testResult.testResults,
        failedTestCaseId: testResult.failedTestCaseId ?? null,
        errorMessage: testResult.errorMessage ?? null,
      },
    });

    console.log(
      `[Job ${job.id}] Run-code finished: ${testResult.finalStatus} (${testResult.testsPassed}/${testResult.testsTotal})`
    );
  } catch (error) {
    console.error(`[Job ${job.id}] Failed to process run-code:`, error);

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    await saveRunState(connection, {
      ...runningState,
      status: 'FINISHED',
      finishedAt: new Date().toISOString(),
      result: {
        finalStatus: 'SYSTEM_ERROR',
        testsPassed: 0,
        testsTotal: 0,
        totalDurationMs: 0,
        testResults: [],
        failedTestCaseId: null,
        errorMessage,
      },
    }).catch((stateError) => {
      console.error(
        `[Job ${job.id}] Could not persist run-code failure state:`,
        stateError
      );
    });

    throw error;
  }
}

const worker = new Worker(
  'code-execution',
  async (job) => {
    if (job.name === 'run-code') {
      return processRunCodeJob(job);
    }

    if (job.name === 'execute-code') {
      return processSubmissionJob(job);
    }

    throw new Error(`Unsupported job type: ${job.name}`);
  },
  { connection }
);

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});

async function shutdown(signal: NodeJS.Signals) {
  console.log(`\nReceived ${signal}, shutting down worker...`);
  await worker.close();
  await connection.quit().catch(() => undefined);
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
