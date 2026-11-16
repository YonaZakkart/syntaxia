import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Hono } from 'hono';
import { signAccessToken } from '../lib/jwt';
import type { AppEnv } from '../types';
import { authMiddleware } from './auth';

const token = signAccessToken({
  userId: 'user-1',
  email: 'user@example.com',
  role: 'USER',
});

function createApp() {
  const app = new Hono<AppEnv>();
  app.use('*', authMiddleware);
  return app;
}

describe('authMiddleware', () => {
  it('rejects requests without a bearer token', async () => {
    const app = createApp();
    app.get('/', (c) => c.json({ success: true }));

    const response = await app.request('/');

    assert.equal(response.status, 401);
  });

  it('rejects malformed tokens', async () => {
    const app = createApp();
    app.get('/', (c) => c.json({ success: true }));

    const response = await app.request('/', {
      headers: { Authorization: 'Bearer not-a-token' },
    });

    assert.equal(response.status, 401);
  });

  it('passes the decoded user to the route', async () => {
    const app = createApp();
    app.get('/', (c) => c.json(c.get('user')));

    const response = await app.request('/', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = (await response.json()) as {
      userId: string;
      email: string;
      role: string;
    };

    assert.equal(response.status, 200);
    assert.equal(body.userId, 'user-1');
    assert.equal(body.email, 'user@example.com');
    assert.equal(body.role, 'USER');
  });

  it('lets downstream errors propagate instead of masking them as 401', async () => {
    const app = createApp();
    app.get('/boom', () => {
      throw new Error('boom');
    });
    app.onError((_error, c) =>
      c.json({ success: false, error: 'Internal Server Error' }, 500)
    );

    const response = await app.request('/boom', {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.equal(response.status, 500);
  });
});
