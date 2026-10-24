import type { Context, Next } from 'hono';
import { JwtPayload, verifyToken } from '../lib/jwt';

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json(
      { success: false, error: 'Unauthorized: No token provided' },
      401
    );
  }

  const token = authHeader.substring(7); // Remove 'Bearer '

  try {
    const payload = verifyToken(token);
    c.set('user', payload); // Attach user to context
    await next();
  } catch (error) {
    return c.json(
      { success: false, error: 'Unauthorized: Invalid token' },
      401
    );
  }
}
