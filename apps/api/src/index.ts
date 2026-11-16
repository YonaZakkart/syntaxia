import './lib/env';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import authRoute from './routes/auth';
import challengesRoute from './routes/challenges';
import submissionsRoute from './routes/submissions';

const app = new Hono();

// Global middleware
app.use('*', logger());
app.use('*', cors());

app.onError((error, c) => {
  console.error('Unhandled API error:', error);
  return c.json({ success: false, error: 'Internal Server Error' }, 500);
});

app.notFound((c) => c.json({ success: false, error: 'Not Found' }, 404));

// Health check
app.get('/', (c) => c.json({ message: 'Syntaxia API is running' }));

// Routes
app.route('/api/auth', authRoute);
app.route('/api/challenges', challengesRoute);
app.route('/api/submissions', submissionsRoute);

const port = Number(process.env.PORT ?? 3001);
console.log(`Server is running on http://localhost:${port}`);
serve({
  fetch: app.fetch,
  port,
});
