import type { Context, Next } from 'hono';
import { type JwtPayload, verifyToken } from '../lib/jwt';
import type { AppEnv } from '../types';

export async function authMiddleware(c: Context<AppEnv>, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json(
      { success: false, error: 'Unauthorized: No token provided' },
      401
    );
  }

  const token = authHeader.substring(7); // Remove 'Bearer '

  let payload: JwtPayload;
  try {
    payload = verifyToken(token);
  } catch {
    return c.json(
      { success: false, error: 'Unauthorized: Invalid token' },
      401
    );
  }

  c.set('user', payload);
  // Let downstream errors reach app.onError instead of masking them as 401.
  await next();
}
