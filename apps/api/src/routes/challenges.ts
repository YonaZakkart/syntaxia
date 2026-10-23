import { prisma } from '@syntaxia/db';
import { Hono } from 'hono';

const app = new Hono();

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

export default app;
