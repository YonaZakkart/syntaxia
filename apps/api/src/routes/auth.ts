import { Prisma, prisma } from '@syntaxia/db';
import { Hono } from 'hono';
import type { Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { z } from 'zod';
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
} from '../lib/jwt';
import { comparePassword, hashPassword } from '../lib/password';
import {
  createRefreshToken,
  detectReusedRefreshToken,
  revokeAllUserRefreshTokens,
  revokeRefreshToken,
  validateRefreshToken,
} from '../lib/refreshToken';
import { authMiddleware } from '../middleware/auth';
import { loginRateLimit, strictRateLimit } from '../middleware/rateLimit';

const app = new Hono();

// Validation schemas
const emailSchema = z.string().trim().toLowerCase().email();

const registerSchema = z.object({
  email: emailSchema,
  password: z.string().min(6),
  name: z.string().optional(),
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string(),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// Helper to set refresh token cookie
function setRefreshTokenCookie(
  c: Context,
  refreshToken: string,
  expiresAt: Date
) {
  setCookie(c, 'refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    path: '/api/auth/refresh',
    expires: expiresAt,
  });
}

// Helper to clear refresh token cookie
function clearRefreshTokenCookie(c: Context) {
  deleteCookie(c, 'refreshToken', {
    path: '/api/auth/refresh',
  });
}

// POST /api/auth/register
app.post('/register', strictRateLimit, async (c) => {
  try {
    const body = await c.req.json();
    const validated = registerSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email },
    });

    if (existingUser) {
      return c.json({ success: false, error: 'Email already registered' }, 400);
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(validated.password);
    const user = await prisma.user.create({
      data: {
        email: validated.email,
        name: validated.name,
        password: hashedPassword,
      },
    });

    // Generate access token
    const accessToken = signAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Generate refresh token
    const { refreshToken, expiresAt } = await createRefreshToken(user.id);
    setRefreshTokenCookie(c, refreshToken, expiresAt);

    return c.json({
      success: true,
      data: {
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return c.json({ success: false, error: 'Invalid JSON body' }, 400);
    }
    if (error instanceof z.ZodError) {
      return c.json(
        { success: false, error: 'Invalid input', details: error.issues },
        400
      );
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return c.json({ success: false, error: 'Email already registered' }, 400);
    }
    console.error('Error registering user:', error);
    return c.json({ success: false, error: 'Internal Server Error' }, 500);
  }
});

// POST /api/auth/login
app.post('/login', loginRateLimit, async (c) => {
  try {
    const body = await c.req.json();
    const validated = loginSchema.parse(body);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: validated.email },
    });

    if (!user) {
      return c.json({ success: false, error: 'Invalid credentials' }, 401);
    }

    // Verify password
    const isValidPassword = await comparePassword(
      validated.password,
      user.password
    );

    if (!isValidPassword) {
      return c.json({ success: false, error: 'Invalid credentials' }, 401);
    }

    // Generate access token
    const accessToken = signAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Generate refresh token
    const { refreshToken, expiresAt } = await createRefreshToken(user.id);
    setRefreshTokenCookie(c, refreshToken, expiresAt);

    return c.json({
      success: true,
      data: {
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return c.json({ success: false, error: 'Invalid JSON body' }, 400);
    }
    if (error instanceof z.ZodError) {
      return c.json(
        { success: false, error: 'Invalid input', details: error.issues },
        400
      );
    }
    console.error('Error logging in:', error);
    return c.json({ success: false, error: 'Internal Server Error' }, 500);
  }
});

// POST /api/auth/refresh
app.post('/refresh', strictRateLimit, async (c) => {
  try {
    // Get refresh token from cookie or body
    const refreshToken =
      getCookie(c, 'refreshToken') || (await c.req.json()).refreshToken;

    if (!refreshToken) {
      return c.json({ success: false, error: 'Refresh token required' }, 401);
    }

    // Check for token reuse (security feature)
    const isReused = await detectReusedRefreshToken(refreshToken);
    if (isReused) {
      // Token was already used - possible token theft
      // Revoke all user's tokens for safety
      const decoded = await import('../lib/jwt')
        .then((m) => m.verifyRefreshToken(refreshToken))
        .catch(() => null);
      if (decoded?.userId) {
        await revokeAllUserRefreshTokens(decoded.userId);
      }
      clearRefreshTokenCookie(c);
      return c.json(
        { success: false, error: 'Token reuse detected. Please log in again.' },
        401
      );
    }

    // Validate and rotate refresh token
    const result = await import('../lib/refreshToken').then((m) =>
      m.rotateRefreshToken(refreshToken)
    );

    if (!result) {
      clearRefreshTokenCookie(c);
      return c.json(
        { success: false, error: 'Invalid or expired refresh token' },
        401
      );
    }

    setRefreshTokenCookie(c, result.refreshToken, result.expiresAt);

    return c.json({
      success: true,
      data: {
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return c.json({ success: false, error: 'Invalid JSON body' }, 400);
    }
    if (error instanceof z.ZodError) {
      return c.json(
        { success: false, error: 'Invalid input', details: error.issues },
        400
      );
    }
    console.error('Error refreshing token:', error);
    return c.json({ success: false, error: 'Internal Server Error' }, 500);
  }
});

// POST /api/auth/logout
app.post('/logout', authMiddleware, async (c) => {
  try {
    const user = c.get('user');

    // Revoke all refresh tokens for this user
    await revokeAllUserRefreshTokens(user.userId);

    clearRefreshTokenCookie(c);

    return c.json({
      success: true,
      data: { message: 'Logged out successfully' },
    });
  } catch (error) {
    console.error('Error logging out:', error);
    return c.json({ success: false, error: 'Internal Server Error' }, 500);
  }
});

export default app;
