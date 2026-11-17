import { getConnInfo } from '@hono/node-server/conninfo';
import type { Context, MiddlewareHandler, Next } from 'hono';
import IORedis from 'ioredis';

const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

redis.on('error', (error) => {
  console.error('[rate-limiter] Redis connection error:', error.message);
});

interface RateLimitOptions {
  windowMs: number;
  limit: number;
  keyPrefix: string;
}

function createRateLimiter(options: RateLimitOptions): MiddlewareHandler {
  const { windowMs, limit, keyPrefix } = options;
  const windowSec = Math.ceil(windowMs / 1000);

  return async (c: Context, next: Next) => {
    const user = c.get('user');
    let key: string;

    if (user) {
      key = `${keyPrefix}:user:${user.userId}`;
    } else {
      const info = getConnInfo(c);
      key = `${keyPrefix}:ip:${info.remote.address}`;
    }

    const now = Date.now();
    const multi = redis.multi();
    multi.zadd(key, now, `${now}-${Math.random()}`);
    multi.zremrangebyscore(key, 0, now - windowMs);
    multi.zcard(key);
    multi.expire(key, windowSec);
    const results = await multi.exec();

    const totalHits = (results?.[2]?.[1] as number) ?? 0;

    if (totalHits > limit) {
      return c.json({ success: false, error: 'Too Many Requests' }, 429, {
        'Retry-After': String(windowSec),
        'X-RateLimit-Limit': String(limit),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.ceil((now + windowMs) / 1000)),
      });
    }

    // Add rate limit headers to successful responses
    c.header('X-RateLimit-Limit', String(limit));
    c.header('X-RateLimit-Remaining', String(limit - totalHits));
    c.header('X-RateLimit-Reset', String(Math.ceil((now + windowMs) / 1000)));

    await next();
  };
}

export const globalRateLimit = createRateLimiter({
  windowMs: 60_000,
  limit: 100,
  keyPrefix: 'global',
});

export const registerRateLimit = createRateLimiter({
  windowMs: 15 * 60_000,
  limit: 5,
  keyPrefix: 'auth:register',
});

export const loginRateLimit = createRateLimiter({
  windowMs: 15 * 60_000,
  limit: 10,
  keyPrefix: 'auth:login',
});

export const refreshRateLimit = createRateLimiter({
  windowMs: 15 * 60_000,
  limit: 5,
  keyPrefix: 'auth:refresh',
});

export const submissionRateLimit = createRateLimiter({
  windowMs: 60_000,
  limit: 30,
  keyPrefix: 'submissions',
});

export const challengeRateLimit = createRateLimiter({
  windowMs: 60_000,
  limit: 60,
  keyPrefix: 'challenges',
});
