'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useChallenge } from '@/hooks/use-challenge';
import { useChallenges } from '@/hooks/use-challenges';
import {
  AlertTriangle,
  ArrowLeft,
  Clock,
  Cpu,
  FileOutput,
  type LucideIcon,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { ChallengeWorkspace } from './challenge-workspace';
import { getDifficultyMeta } from './difficulty';

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) {
    const megabytes = bytes / (1024 * 1024);
    return `${Number.isInteger(megabytes) ? megabytes : megabytes.toFixed(1)} MB`;
  }

  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${bytes} B`;
}

export function ChallengeDetail({ challengeId }: { challengeId: string }) {
  const { challenge, status, error, reload } = useChallenge(challengeId);
  const { challenges } = useChallenges();

  if (status === 'loading') return <DetailSkeleton />;
  if (status === 'not-found') return <NotFoundState />;
  if (status === 'error' || !challenge) {
    return <ErrorState message={error} onRetry={reload} />;
  }

  const difficulty = getDifficultyMeta(challenge.difficulty);
  const publicTests = challenge.testCases.filter(
    (testCase) => testCase.isPublic
  );

  return (
    <div className="space-y-6">
      <div>
        <Button asChild className="-ml-2 mb-4 h-9" size="sm" variant="ghost">
          <Link href="/challenges">
            <ArrowLeft aria-hidden className="size-4" />
            Back to challenges
          </Link>
        </Button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={difficulty.className} variant="outline">
                {difficulty.label}
              </Badge>
              <Badge
                className="border-white/10 text-slate-300"
                variant="outline"
              >
                {challenge.language.name} {challenge.language.version}
              </Badge>
            </div>
            <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              {challenge.title}
            </h1>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,0.8fr)]">
        <div className="space-y-6">
          <Card className="border-white/5 bg-white/[0.03]">
            <CardHeader>
              <CardTitle className="text-base">Statement</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                {challenge.description}
              </p>
            </CardContent>
          </Card>

          <ChallengeWorkspace
            challenge={challenge}
            key={challenge.id}
            variants={challenges}
          />

          <Card className="border-white/5 bg-white/[0.03]">
            <CardHeader>
              <CardTitle className="text-base">Public tests</CardTitle>
              <CardDescription>
                Only the cases you can use while practicing. Hidden tests grade
                the final submission.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {publicTests.length === 0 ? (
                <p className="text-sm text-slate-400">
                  This challenge has no public tests.
                </p>
              ) : (
                publicTests.map((testCase, index) => (
                  <div
                    className="rounded-xl border border-white/5 bg-[#050b1a] p-4"
                    key={testCase.id}
                  >
                    <p className="font-mono text-[11px] tracking-[0.2em] text-slate-500 uppercase">
                      Case {index + 1}
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-slate-500">Input</p>
                        <pre className="mt-1 overflow-x-auto font-mono text-xs leading-5 text-slate-300">
                          {testCase.input}
                        </pre>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">
                          Expected output
                        </p>
                        <pre className="mt-1 overflow-x-auto font-mono text-xs leading-5 text-emerald-300">
                          {testCase.expectedOutput}
                        </pre>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-white/5 bg-white/[0.03]">
            <CardHeader>
              <CardTitle className="text-base">Limits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <LimitRow
                icon={Clock}
                label="Time"
                value={`${challenge.limits.timeLimitMs} ms`}
              />
              <LimitRow
                icon={Cpu}
                label="Memory"
                value={`${challenge.limits.memoryLimitMb} MB`}
              />
              <LimitRow
                icon={FileOutput}
                label="Output"
                value={formatBytes(challenge.limits.outputLimitBytes)}
              />
            </CardContent>
          </Card>

          <Card className="border-white/5 bg-white/[0.03]">
            <CardHeader>
              <CardTitle className="text-base">Environment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-400">
              <p>
                <span className="text-slate-500">Language:</span>{' '}
                {challenge.language.name}
              </p>
              <p>
                <span className="text-slate-500">Version:</span>{' '}
                {challenge.language.version}
              </p>
              <p className="break-all">
                <span className="text-slate-500">Image:</span>{' '}
                <code className="font-mono text-xs text-slate-300">
                  {challenge.language.dockerImage}
                </code>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function LimitRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-slate-400">
        <Icon aria-hidden className="size-4" />
        {label}
      </span>
      <span className="font-mono text-xs text-slate-200">{value}</span>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div aria-hidden className="space-y-6">
      <div className="h-9 w-40 animate-pulse rounded-lg bg-white/5" />
      <div className="h-10 w-2/3 animate-pulse rounded-lg bg-white/5" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,0.8fr)]">
        <div className="space-y-6">
          <div className="h-48 animate-pulse rounded-xl bg-white/5" />
          <div className="h-56 animate-pulse rounded-xl bg-white/5" />
        </div>
        <div className="space-y-6">
          <div className="h-36 animate-pulse rounded-xl bg-white/5" />
          <div className="h-36 animate-pulse rounded-xl bg-white/5" />
        </div>
      </div>
    </div>
  );
}

function NotFoundState() {
  return (
    <Card className="border-dashed border-white/10 bg-transparent">
      <CardContent className="flex flex-col items-center gap-4 px-6 py-16 text-center">
        <span className="grid size-12 place-items-center rounded-2xl border border-white/10 bg-white/5 text-slate-400">
          <AlertTriangle aria-hidden className="size-5" />
        </span>
        <div>
          <p className="text-lg font-semibold">Challenge not found</p>
          <p className="mt-1 text-sm text-slate-400">
            The link may be outdated or the challenge was removed.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/challenges">
            <ArrowLeft aria-hidden className="size-4" />
            Back to challenges
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string | null;
  onRetry: () => Promise<void>;
}) {
  return (
    <Card className="border-rose-400/20 bg-rose-400/5">
      <CardContent className="flex flex-col items-center gap-4 px-6 py-16 text-center">
        <span className="grid size-12 place-items-center rounded-2xl border border-rose-400/25 bg-rose-400/10 text-rose-300">
          <AlertTriangle aria-hidden className="size-5" />
        </span>
        <div>
          <p className="text-lg font-semibold">Could not load the challenge</p>
          <p className="mt-1 text-sm text-slate-400">
            {message ?? 'Try again in a moment.'}
          </p>
        </div>
        <Button
          onClick={() => {
            void onRetry();
          }}
          variant="outline"
        >
          <RefreshCw aria-hidden className="size-4" />
          Retry
        </Button>
      </CardContent>
    </Card>
  );
}
