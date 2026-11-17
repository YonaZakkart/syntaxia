import './lib/env';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { logger } from 'hono/logger';
import { globalRateLimit } from './middleware/rateLimit';
import authRoute from './routes/auth';
import challengesRoute from './routes/challenges';
import executionsRoute from './routes/executions';
import submissionsRoute from './routes/submissions';

const app = new Hono();

// Global middleware
app.use('*', logger());
app.use('*', cors());
app.use('*', globalRateLimit);

app.onError((error, c) => {
  if (error instanceof HTTPException) {
    return error.getResponse();
  }

  console.error('Unhandled API error:', error);
  return c.json({ success: false, error: 'Internal Server Error' }, 500);
});

app.notFound((c) => c.json({ success: false, error: 'Not Found' }, 404));

// Health check
app.get('/', (c) => c.json({ message: 'Syntaxia API is running' }));

// Routes
app.route('/api/auth', authRoute);
app.route('/api/challenges', challengesRoute);
app.route('/api/executions', executionsRoute);
app.route('/api/submissions', submissionsRoute);

const port = Number(process.env.PORT ?? 3001);
console.log(`Server is running on http://localhost:${port}`);
serve({
  fetch: app.fetch,
  port,
});
