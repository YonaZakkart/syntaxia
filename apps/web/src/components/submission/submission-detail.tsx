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
import { useSubmission } from '@/hooks/use-submission';
import { formatDateTime, formatDuration } from '@/lib/format';
import { isFinalSubmissionStatus } from '@/types/submission';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Code2,
  Loader2,
  type LucideIcon,
  RefreshCw,
  Send,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { getDifficultyMeta } from '../challenge/difficulty';
import { getSubmissionStatusMeta } from './status';
import { TestResultsList } from './test-results';

export function SubmissionDetailView({
  submissionId,
}: {
  submissionId: string;
}) {
  const { submission, status, error, reload } = useSubmission(submissionId);

  if (status === 'loading') return <DetailSkeleton />;
  if (status === 'not-found') return <NotFoundState />;
  if (status === 'error' || !submission) {
    return <ErrorState message={error} onRetry={reload} />;
  }

  const statusMeta = getSubmissionStatusMeta(submission.status);
  const difficulty = getDifficultyMeta(submission.challenge.difficulty);
  const execution = submission.execution;
  const pending = !isFinalSubmissionStatus(submission.status);
  const results = execution
    ? (Array.isArray(execution.testResults) ? execution.testResults : []).map(
        (test, index) => ({
          id: test.testCaseId ?? `test-${index}`,
          passed: test.passed ?? false,
          duration: test.duration,
          input: test.input,
          expectedOutput: test.expectedOutput,
          actualOutput: test.actualOutput,
          error: test.error,
          hidden: test.hidden,
        })
      )
    : [];

  return (
    <div className="space-y-6">
      <div>
        <Button asChild className="-ml-2 mb-4 h-9" size="sm" variant="ghost">
          <Link href="/submissions">
            <ArrowLeft aria-hidden className="size-4" />
            Back to submissions
          </Link>
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          <Badge className={statusMeta.className} variant="outline">
            {statusMeta.label}
          </Badge>
          <Badge className={difficulty.className} variant="outline">
            {difficulty.label}
          </Badge>
          <Badge className="border-white/10 text-slate-300" variant="outline">
            {submission.language.name}
          </Badge>
        </div>

        <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          <Link
            className="transition hover:text-brand focus-visible:text-brand focus-visible:outline-none"
            href={`/challenges/${submission.challenge.id}`}
          >
            {submission.challenge.title}
          </Link>
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Submitted {formatDateTime(submission.createdAt)}
        </p>
      </div>

      {pending ? (
        <div
          aria-live="polite"
          className="flex items-center gap-2 rounded-xl border border-sky-400/20 bg-sky-400/5 px-4 py-3 text-sm text-sky-200"
        >
          <Loader2 aria-hidden className="size-4 animate-spin" />
          Grading in progress. This page refreshes automatically.
        </div>
      ) : null}

      <Card className="border-white/5 bg-white/[0.03]">
        <CardHeader>
          <CardTitle className="text-base">Result</CardTitle>
          <CardDescription>
            {execution
              ? `Graded against ${execution.testsTotal} test case${
                  execution.testsTotal === 1 ? '' : 's'
                }.`
              : 'The worker has not produced a result yet.'}
          </CardDescription>
        </CardHeader>
        <CardContent aria-live="polite" className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryItem
              label="Tests passed"
              value={
                execution
                  ? `${execution.testsPassed}/${execution.testsTotal}`
                  : 'Pending'
              }
            />
            <SummaryItem
              label="Duration"
              value={
                execution ? formatDuration(execution.totalDurationMs) : '—'
              }
            />
            <SummaryItem
              label="Status"
              value={getSubmissionStatusMeta(submission.status).label}
            />
          </div>

          {execution?.errorMessage ? (
            <p className="rounded-lg border border-rose-400/20 bg-rose-400/5 px-3 py-2 text-sm text-rose-200">
              {execution.errorMessage}
            </p>
          ) : null}

          {execution ? (
            <div>
              <p className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300">
                {execution.testsPassed === execution.testsTotal ? (
                  <CheckCircle2
                    aria-hidden
                    className="size-4 text-emerald-300"
                  />
                ) : (
                  <XCircle aria-hidden className="size-4 text-rose-300" />
                )}
                Per-test results
              </p>
              <TestResultsList results={results} />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,0.8fr)]">
        <Card className="border-white/5 bg-white/[0.03]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Code2 aria-hidden className="size-4" />
              Submitted code
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-xl border border-white/5 bg-[#050b1a] p-4 font-mono text-xs leading-5 text-slate-300">
              <code>{submission.code}</code>
            </pre>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-white/[0.03]">
          <CardHeader>
            <CardTitle className="text-base">Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4">
              <TimelineItem
                at={submission.createdAt}
                icon={Send}
                label="Submitted"
              />
              {execution ? (
                <TimelineItem
                  at={execution.createdAt}
                  detail={statusMeta.label}
                  icon={CheckCircle2}
                  label="Graded"
                />
              ) : (
                <TimelineItem
                  detail="Waiting for the worker"
                  icon={Loader2}
                  label="Grading"
                  pending
                />
              )}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TimelineItem({
  icon: Icon,
  label,
  at,
  detail,
  pending = false,
}: {
  icon: LucideIcon;
  label: string;
  at?: string;
  detail?: string;
  pending?: boolean;
}) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-slate-300">
        <Icon
          aria-hidden
          className={pending ? 'size-3.5 animate-spin' : 'size-3.5'}
        />
      </span>
      <div>
        <p className="text-sm text-slate-200">{label}</p>
        <p className="text-xs text-slate-500">
          {at ? formatDateTime(at) : 'In progress'}
        </p>
        {detail ? <p className="text-xs text-slate-400">{detail}</p> : null}
      </div>
    </li>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-[#050b1a] px-3 py-2">
      <p className="text-[11px] tracking-wide text-slate-500 uppercase">
        {label}
      </p>
      <p className="mt-1 font-mono text-sm text-slate-200">{value}</p>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div aria-hidden className="space-y-6">
      <div className="h-9 w-44 animate-pulse rounded-lg bg-white/5" />
      <div className="h-10 w-2/3 animate-pulse rounded-lg bg-white/5" />
      <div className="h-56 animate-pulse rounded-xl bg-white/5" />
      <div className="h-64 animate-pulse rounded-xl bg-white/5" />
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
          <p className="text-lg font-semibold">Submission not found</p>
          <p className="mt-1 text-sm text-slate-400">
            The link may be outdated or the submission belongs to another user.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/submissions">
            <ArrowLeft aria-hidden className="size-4" />
            Back to submissions
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
          <p className="text-lg font-semibold">Could not load the submission</p>
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
