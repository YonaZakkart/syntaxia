import { AuthProvider } from '@/components/auth/auth-provider';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Syntaxia — Practice code, ship confidence',
  description:
    'An AI-powered coding practice platform with a real online judge, secure code execution and per-test feedback.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html className="dark" lang="en">
      <body className="min-h-screen bg-surface text-slate-100 antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
