'use client';

import { AppShell } from '@/components/layout/app-shell';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect } from 'react';
import { useAuth } from './auth-provider';

function SessionLoading() {
  return (
    <div className="grid min-h-screen place-items-center bg-surface">
      <div className="flex items-center gap-3 text-sm text-slate-400">
        <Loader2 aria-hidden className="size-4 animate-spin text-brand" />
        Checking your session…
      </div>
    </div>
  );
}

export function ProtectedShell({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'guest') router.replace('/login');
  }, [status, router]);

  if (status !== 'authenticated') return <SessionLoading />;

  return <AppShell>{children}</AppShell>;
}
