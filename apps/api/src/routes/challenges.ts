import { prisma } from '@syntaxia/db';
import { Hono } from 'hono';
import { z } from 'zod';
import { resolveExecutionLimits } from '../lib/limits';
import { challengeRateLimit } from '../middleware/rateLimit';

const app = new Hono();

// Apply rate limiting to all challenge routes
app.use('*', challengeRateLimit);

// Zod 4's .uuid() enforces RFC version/variant nibbles, but existing
// challenge and language ids in the database are not canonical UUIDs.
// Accept any UUID-shaped id so legacy records stay usable.
const idSchema = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    'Invalid id'
  );

app.get('/', async (c) => {
  try {
    const challenges = await prisma.challenge.findMany({
      select: {
        id: true,
        title: true,
        difficulty: true,
        language: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return c.json({ success: true, data: challenges });
  } catch (error) {
    console.error('Error fetching challenges:', error);
    return c.json({ success: false, error: 'Internal Server Error' }, 500);
  }
});

app.get('/:id', async (c) => {
  const id = c.req.param('id');

  const validation = idSchema.safeParse(id);
  if (!validation.success) {
    return c.json(
      { success: false, error: 'Invalid id', details: validation.error.issues },
      400
    );
  }

  try {
    const challenge = await prisma.challenge.findUnique({
      where: { id },
      include: {
        language: true,
        testCases: {
          // Private test cases never leave the API; they are grading-only.
          where: { isPublic: true },
          select: {
            id: true,
            input: true,
            expectedOutput: true,
            isPublic: true,
          },
        },
      },
    });

    if (!challenge) {
      return c.json({ success: false, error: 'Challenge not found' }, 404);
    }

    return c.json({
      success: true,
      data: {
        id: challenge.id,
        title: challenge.title,
        description: challenge.description,
        difficulty: challenge.difficulty,
        starterCode: challenge.starterCode,
        language: {
          id: challenge.language.id,
          name: challenge.language.name,
          version: challenge.language.version,
          dockerImage: challenge.language.dockerImage,
        },
        limits: resolveExecutionLimits(challenge, challenge.language),
        testCases: challenge.testCases,
      },
    });
  } catch (error) {
    console.error('Error fetching challenge:', error);
    return c.json({ success: false, error: 'Internal Server Error' }, 500);
  }
});

export default app;
