import { prisma } from '@syntaxia/db';
import { Hono } from 'hono';
import { z } from 'zod';
import { executionQueue } from '../lib/queue';
import { authMiddleware } from '../middleware/auth';

type Env = {
  Variables: {
    user: {
      userId: string;
      email: string;
      role: string;
    };
  };
};

const app = new Hono<Env>();

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
