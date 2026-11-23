import Link from 'next/link';
import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-10">
      <div
        aria-hidden
        className="bg-grid pointer-events-none absolute inset-0 -z-10 opacity-60"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(52,211,153,0.18),transparent_55%)]"
      />

      <div className="w-full max-w-md">
        <Link
          className="mb-8 flex items-center justify-center gap-3 text-lg font-semibold tracking-tight"
          href="/"
        >
          <span className="grid size-10 place-items-center rounded-xl bg-brand font-mono text-sm font-bold text-slate-950">
            {'{ }'}
          </span>
          Syntaxia
        </Link>

        {children}

        <p className="mt-6 text-center text-xs text-slate-500">
          <Link className="transition hover:text-slate-300" href="/">
            Back to landing
          </Link>
        </p>
      </div>
    </div>
  );
}
