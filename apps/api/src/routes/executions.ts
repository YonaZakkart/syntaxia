import { randomUUID } from 'node:crypto';
import { prisma } from '@syntaxia/db';
import { Hono } from 'hono';
import { z } from 'zod';
import { connection, executionQueue } from '../lib/queue';
import {
  type ExecutionRunState,
  RUN_STATE_TTL_SECONDS,
  deleteRunState,
  readRunState,
  saveRunState,
} from '../lib/runStore';
import { authMiddleware } from '../middleware/auth';
import { submissionRateLimit } from '../middleware/rateLimit';
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

const runSchema = z.object({
  challengeId: idSchema,
  languageId: idSchema,
  code: z.string().min(1, 'Code cannot be empty'),
});

const runIdSchema = z.string().uuid('Invalid run id');

function toPublicRunState(state: ExecutionRunState) {
  return {
    runId: state.runId,
    challengeId: state.challengeId,
    languageId: state.languageId,
    status: state.status,
    createdAt: state.createdAt,
    startedAt: state.startedAt,
    finishedAt: state.finishedAt,
    result: state.result,
  };
}

/**
 * Run user code against the challenge's PUBLIC test cases only.
 *
 * Nothing is written to Submission/Execution: the run state lives in Redis
 * with a short TTL and is polled through GET /:runId.
 */
app.post('/', authMiddleware, submissionRateLimit, async (c) => {
  const user = c.get('user');

  try {
    const body = await c.req.json();
    const validated = runSchema.parse(body);

    const challenge = await prisma.challenge.findUnique({
      where: { id: validated.challengeId },
      select: {
        id: true,
        languageId: true,
        testCases: {
          where: { isPublic: true },
          select: { id: true },
          take: 1,
        },
      },
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

    if (challenge.testCases.length === 0) {
      return c.json(
        {
          success: false,
          error: 'No public test cases available for this challenge',
        },
        409
      );
    }

    const runId = randomUUID();
    const state: ExecutionRunState = {
      runId,
      userId: user.userId,
      challengeId: validated.challengeId,
      languageId: validated.languageId,
      status: 'QUEUED',
      createdAt: new Date().toISOString(),
    };

    await saveRunState(connection, state);

    try {
      await executionQueue.add(
        'run-code',
        {
          runId,
          userId: user.userId,
          challengeId: validated.challengeId,
          languageId: validated.languageId,
          code: validated.code,
        },
        { jobId: runId }
      );
    } catch (error) {
      console.error('Error queueing run-code job:', error);
      await deleteRunState(connection, runId).catch((deleteError) => {
        console.error('Error deleting run state:', deleteError);
      });

      return c.json(
        { success: false, error: 'Failed to queue execution' },
        503
      );
    }

    return c.json(
      {
        success: true,
        data: {
          runId,
          status: state.status,
          expiresInSeconds: RUN_STATE_TTL_SECONDS,
        },
      },
      202
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
    console.error('Error creating execution run:', error);
    return c.json({ success: false, error: 'Internal Server Error' }, 500);
  }
});

app.get('/:runId', authMiddleware, async (c) => {
  const user = c.get('user');

  const validation = runIdSchema.safeParse(c.req.param('runId'));
  if (!validation.success) {
    return c.json(
      {
        success: false,
        error: 'Invalid run id',
        details: validation.error.issues,
      },
      400
    );
  }

  try {
    const state = await readRunState(connection, validation.data);

    // Do not reveal whether someone else's run exists.
    if (!state || (state.userId !== user.userId && user.role !== 'ADMIN')) {
      return c.json(
        { success: false, error: 'Execution run not found or expired' },
        404
      );
    }

    return c.json({ success: true, data: toPublicRunState(state) });
  } catch (error) {
    console.error('Error reading execution run:', error);
    return c.json({ success: false, error: 'Internal Server Error' }, 500);
  }
});

export default app;
