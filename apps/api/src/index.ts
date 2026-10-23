import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import challengesRoute from './routes/challenges';

const app = new Hono();

// Middleware global
app.use('*', logger());
app.use('*', cors());

// Health check
app.get('/', (c) => c.json({ message: 'Syntaxia API is running' }));

// Rutas
app.route('/api/challenges', challengesRoute);

const port = 3001;
console.log(`Server is running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
