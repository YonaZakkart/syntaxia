'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useState } from 'react';
import { z } from 'zod';
import { AuthCard } from './auth-card';
import { useAuth } from './auth-provider';

const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type FieldErrors = {
  email?: string;
  password?: string;
};

export function LoginForm() {
  const { login, status } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') router.replace('/challenges');
  }, [status, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);

    const parsed = loginSchema.safeParse({ email, password });

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setErrors({
        email: fieldErrors.email?.[0],
        password: fieldErrors.password?.[0],
      });
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      await login(parsed.data);
      router.replace('/challenges');
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : 'Unable to sign in'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard
      description="Sign in to continue practicing and keep your submission history."
      footer={
        <>
          New here?{' '}
          <Link
            className="font-medium text-brand transition hover:text-emerald-300"
            href="/register"
          >
            Create an account
          </Link>
        </>
      }
      title="Welcome back"
    >
      <form className="space-y-5" noValidate onSubmit={handleSubmit}>
        {serverError ? (
          <div
            className="rounded-lg border border-rose-400/25 bg-rose-400/10 px-3 py-2 text-sm text-rose-200"
            role="alert"
          >
            {serverError}
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            aria-describedby={errors.email ? 'email-error' : undefined}
            aria-invalid={Boolean(errors.email)}
            autoComplete="email"
            disabled={submitting}
            id="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            type="email"
            value={email}
          />
          {errors.email ? (
            <p className="text-xs text-rose-300" id="email-error">
              {errors.email}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            aria-describedby={errors.password ? 'password-error' : undefined}
            aria-invalid={Boolean(errors.password)}
            autoComplete="current-password"
            disabled={submitting}
            id="password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            type="password"
            value={password}
          />
          {errors.password ? (
            <p className="text-xs text-rose-300" id="password-error">
              {errors.password}
            </p>
          ) : null}
        </div>

        <Button className="h-11 w-full" disabled={submitting} type="submit">
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthCard>
  );
}
