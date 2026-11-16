import type { Context, Next } from 'hono';
import { type JwtPayload, verifyAccessToken, verifyToken } from '../lib/jwt';
import type { AppEnv } from '../types';

export async function authMiddleware(c: Context<AppEnv>, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json(
      { success: false, error: 'Unauthorized: No token provided', code: 'NO_TOKEN' },
      401
    );
  }

  const token = authHeader.substring(7); // Remove 'Bearer '

  let payload: JwtPayload;
  try {
    // Verify as access token first
    payload = verifyAccessToken(token);
  } catch (error) {
    // Check if it's a token expiration error
    if (error instanceof Error && error.name === 'TokenExpiredError') {
      return c.json(
        { success: false, error: 'Access token expired', code: 'TOKEN_EXPIRED' },
        401
      );
    }
    // Fall back to legacy token verification for backward compatibility
    try {
      payload = verifyToken(token);
    } catch {
      return c.json(
        { success: false, error: 'Unauthorized: Invalid token', code: 'INVALID_TOKEN' },
        401
      );
    }
  }

  c.set('user', payload);
  // Let downstream errors reach app.onError instead of masking them as 401.
  await next();
}