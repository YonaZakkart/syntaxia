import { prisma } from '@syntaxia/db';
import { Hono } from 'hono';
import { z } from 'zod';
import { executionQueue } from '../lib/queue';
import { authMiddleware } from '../middleware/auth';
import type { AppEnv } from '../types';

const app = new Hono<AppEnv>();

// Zod 4's .uuid() enforces RFC version/variant nibbles, but existing
// challenge and language ids in the database are not canonical UUIDs.
// Accept any UUID-shaped id so legacy records stay usable.
const idSchema = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    'Invalid id'
  );

const submissionSchema = z.object({
  challengeId: idSchema,
  languageId: idSchema,
  code: z.string().min(1, 'Code cannot be empty'),
});

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

interface StoredTestResult {
  testCaseId?: string;
  passed?: boolean;
  expectedOutput?: string;
  actualOutput?: string;
  error?: string;
  duration?: number;
}

/**
 * Hidden test cases must not leak their expected/actual output through the
 * submission detail endpoint. Keep the failure metadata, drop the payloads.
 */
function redactTestResults(
  testResults: unknown,
  publicTestCaseIds: Set<string>
): unknown {
  if (!Array.isArray(testResults)) {
    return testResults;
  }

  return testResults.map((raw) => {
    const result = raw as StoredTestResult;
    const isHidden = !publicTestCaseIds.has(result.testCaseId ?? '');

    if (!isHidden) {
      return result;
    }

    return {
      testCaseId: result.testCaseId,
      passed: result.passed,
      duration: result.duration,
      error: result.error,
      hidden: true,
    };
  });
}

app.get('/', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const parsed = listQuerySchema.safeParse(c.req.query());

    if (!parsed.success) {
      return c.json(
        { success: false, error: 'Invalid input', details: parsed.error.issues },
        400
      );
    }

    const { limit, offset } = parsed.data;
    const where = { userId: user.userId };

    const [items, total] = await prisma.$transaction([
      prisma.submission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          status: true,
          createdAt: true,
          challenge: { select: { id: true, title: true, difficulty: true } },
          language: { select: { id: true, name: true } },
          execution: {
            select: {
              testsPassed: true,
              testsTotal: true,
              totalDurationMs: true,
            },
          },
        },
      }),
      prisma.submission.count({ where }),
    ]);

    return c.json({
      success: true,
      data: { items, total, limit, offset },
    });
  } catch (error) {
    console.error('Error listing submissions:', error);
    return c.json({ success: false, error: 'Internal Server Error' }, 500);
  }
});

app.get('/:id', authMiddleware, async (c) => {
  try {
    const user = c.get('user');

    const submission = await prisma.submission.findUnique({
      where: { id: c.req.param('id') },
      include: {
        challenge: { select: { id: true, title: true, difficulty: true } },
        language: { select: { id: true, name: true } },
        execution: true,
      },
    });

    // Do not reveal whether someone else's submission exists.
    if (
      !submission ||
      (submission.userId !== user.userId && user.role !== 'ADMIN')
    ) {
      return c.json({ success: false, error: 'Submission not found' }, 404);
    }

    let execution = submission.execution;

    if (execution) {
      const testCases = await prisma.testCase.findMany({
        where: { challengeId: submission.challengeId },
        select: { id: true, isPublic: true },
      });
      const publicIds = new Set(
        testCases.filter((testCase) => testCase.isPublic).map((tc) => tc.id)
      );

      execution = {
        ...execution,
        testResults:
          user.role === 'ADMIN'
            ? execution.testResults
            : (redactTestResults(
                execution.testResults,
                publicIds
              ) as typeof execution.testResults),
      };
    }

    return c.json({
      success: true,
      data: { ...submission, execution },
    });
  } catch (error) {
    console.error('Error fetching submission:', error);
    return c.json({ success: false, error: 'Internal Server Error' }, 500);
  }
});

app.post('/', authMiddleware, async (c) => {
  try {
    const user = c.get('user'); // Typed through the Env generic above
    if (!user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const validated = submissionSchema.parse(body);

    // 1. Verify the challenge exists and uses the requested language
    const challenge = await prisma.challenge.findUnique({
      where: { id: validated.challengeId },
      select: { id: true, languageId: true },
    });

    if (!challenge) {
      return c.json({ success: false, error: 'Challenge not found' }, 404);
    }

    if (challenge.languageId !== validated.languageId) {
      return c.json(
        {
          success: false,
          error: 'Language does not match the challenge language',
        },
        400
      );
    }

    // 2. Create the submission record
    const submission = await prisma.submission.create({
      data: {
        userId: user.userId,
        challengeId: validated.challengeId,
        languageId: validated.languageId,
        code: validated.code,
        status: 'QUEUED',
      },
    });

    // 3. Enqueue the job for the Execution Engine
    try {
      await executionQueue.add('execute-code', {
        submissionId: submission.id,
      });
    } catch (error) {
      console.error('Error queueing submission:', error);
      // Do not leave the submission stuck in QUEUED forever.
      await prisma.submission
        .update({
          where: { id: submission.id },
          data: { status: 'SYSTEM_ERROR' },
        })
        .catch((updateError) => {
          console.error(
            'Error marking submission as SYSTEM_ERROR:',
            updateError
          );
        });

      return c.json(
        { success: false, error: 'Failed to queue submission' },
        503
      );
    }

    return c.json(
      {
        success: true,
        data: {
          submissionId: submission.id,
          status: submission.status,
        },
      },
      201
    );
  } catch (error) {
    if (error instanceof SyntaxError) {
      return c.json({ success: false, error: 'Invalid JSON body' }, 400);
    }
    if (error instanceof z.ZodError) {
      return c.json(
        { success: false, error: 'Invalid input', details: error.issues },
        400
      );
    }
    console.error('Error creating submission:', error);
    return c.json({ success: false, error: 'Internal Server Error' }, 500);
  }
});

export default app;
