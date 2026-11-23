import { LoginForm } from '@/components/auth/login-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign in — Syntaxia',
  description: 'Sign in to your Syntaxia account.',
};

export default function LoginPage() {
  return <LoginForm />;
}
