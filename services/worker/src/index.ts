import './lib/env';
import { prisma } from '@syntaxia/db';
import { Worker } from 'bullmq';
import IORedis from 'ioredis';
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

const worker = new Worker(
  'code-execution',
  async (job) => {
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

      // 3. Execute the test runner
      console.log(`[Job ${job.id}] Running test runner...`);

      const testResult = await runTests({ submission });

      console.log(`[Job ${job.id}] Test runner result:`, {
        finalStatus: testResult.finalStatus,
        testsPassed: testResult.testsPassed,
        testsTotal: testResult.testsTotal,
        errorMessage: testResult.errorMessage,
        totalDuration: `${testResult.totalDuration}ms`,
      });

      // 4. Persist the final status reported by the test runner
      await prisma.submission.update({
        where: { id: submissionId },
        data: { status: testResult.finalStatus },
      });

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
