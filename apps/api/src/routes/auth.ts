import { Prisma, prisma } from '@syntaxia/db';
import { Hono } from 'hono';
import { z } from 'zod';
import { signToken } from '../lib/jwt';
import { comparePassword, hashPassword } from '../lib/password';
import { strictRateLimit, loginRateLimit } from '../middleware/rateLimit';

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

    // Generate JWT
    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return c.json({
      success: true,
      data: {
        token,
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

    // Generate JWT
    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return c.json({
      success: true,
      data: {
        token,
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

export default app;
