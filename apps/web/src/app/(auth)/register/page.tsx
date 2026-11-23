import { RegisterForm } from '@/components/auth/register-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create account — Syntaxia',
  description: 'Create a Syntaxia account to track your progress.',
};

export default function RegisterPage() {
  return <RegisterForm />;
}
