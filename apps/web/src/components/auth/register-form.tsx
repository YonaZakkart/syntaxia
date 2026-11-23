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

const registerSchema = z
  .object({
    name: z.string().trim().max(80, 'Name is too long').optional(),
    email: z.string().trim().email('Enter a valid email'),
    password: z.string().min(6, 'Use at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FieldErrors = {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
};

export function RegisterForm() {
  const { register, status } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') router.replace('/challenges');
  }, [status, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);

    const parsed = registerSchema.safeParse({
      name,
      email,
      password,
      confirmPassword,
    });

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setErrors({
        name: fieldErrors.name?.[0],
        email: fieldErrors.email?.[0],
        password: fieldErrors.password?.[0],
        confirmPassword: fieldErrors.confirmPassword?.[0],
      });
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      await register({
        name: parsed.data.name || undefined,
        email: parsed.data.email,
        password: parsed.data.password,
      });
      router.replace('/challenges');
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : 'Unable to create the account'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard
      description="Create an account to track your progress and submissions."
      footer={
        <>
          Already have an account?{' '}
          <Link
            className="font-medium text-brand transition hover:text-emerald-300"
            href="/login"
          >
            Sign in
          </Link>
        </>
      }
      title="Create your account"
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
          <Label htmlFor="name">
            Name <span className="text-slate-500">(optional)</span>
          </Label>
          <Input
            aria-describedby={errors.name ? 'name-error' : undefined}
            aria-invalid={Boolean(errors.name)}
            autoComplete="name"
            disabled={submitting}
            id="name"
            onChange={(event) => setName(event.target.value)}
            placeholder="Ada Lovelace"
            value={name}
          />
          {errors.name ? (
            <p className="text-xs text-rose-300" id="name-error">
              {errors.name}
            </p>
          ) : null}
        </div>

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
            autoComplete="new-password"
            disabled={submitting}
            id="password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 6 characters"
            type="password"
            value={password}
          />
          {errors.password ? (
            <p className="text-xs text-rose-300" id="password-error">
              {errors.password}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm password</Label>
          <Input
            aria-describedby={
              errors.confirmPassword ? 'confirm-password-error' : undefined
            }
            aria-invalid={Boolean(errors.confirmPassword)}
            autoComplete="new-password"
            disabled={submitting}
            id="confirm-password"
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Repeat your password"
            type="password"
            value={confirmPassword}
          />
          {errors.confirmPassword ? (
            <p className="text-xs text-rose-300" id="confirm-password-error">
              {errors.confirmPassword}
            </p>
          ) : null}
        </div>

        <Button className="h-11 w-full" disabled={submitting} type="submit">
          {submitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </AuthCard>
  );
}
