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

const submissionSchema = z.object({
  challengeId: z.string().uuid('Invalid challengeId'),
  languageId: z.string().uuid('Invalid languageId'),
  code: z.string().min(1, 'Code cannot be empty'),
});

app.post('/', authMiddleware, async (c) => {
  try {
    const user = c.get('user'); // Ahora TypeScript sabe el tipo correcto
    if (!user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const validated = submissionSchema.parse(body);

    // 1. Crear el registro de submission en la base de datos
    const submission = await prisma.submission.create({
      data: {
        userId: user.userId,
        challengeId: validated.challengeId,
        languageId: validated.languageId,
        code: validated.code,
        status: 'QUEUED',
      },
    });

    // 2. Encolar el trabajo para el Execution Engine
    await executionQueue.add('execute-code', {
      submissionId: submission.id,
    });

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
