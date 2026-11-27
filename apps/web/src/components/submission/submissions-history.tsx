'use client';

import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useChallenges } from '@/hooks/use-challenges';
import { useSubmissions } from '@/hooks/use-submissions';
import { formatDateTime, formatDuration } from '@/lib/format';
import type { SubmissionSummary } from '@/types/submission';
import {
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  ListChecks,
  RefreshCw,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { getDifficultyMeta } from '../challenge/difficulty';
import { getSubmissionStatusMeta } from './status';

const skeletonKeys = ['first', 'second', 'third', 'fourth', 'fifth'];

const selectClassName =
  'h-10 w-full rounded-lg border border-white/10 bg-panel px-3 text-sm text-slate-200 outline-none transition focus:border-brand/50 focus:ring-2 focus:ring-brand/20';

const statusOptions = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'PASSED', label: 'Accepted' },
  { value: 'WRONG_ANSWER', label: 'Wrong answer' },
  { value: 'TIME_LIMIT_EXCEEDED', label: 'Time limit exceeded' },
  { value: 'MEMORY_LIMIT_EXCEEDED', label: 'Memory limit exceeded' },
  { value: 'RUNTIME_ERROR', label: 'Runtime error' },
  { value: 'COMPILATION_ERROR', label: 'Compilation error' },
  { value: 'SYSTEM_ERROR', label: 'System error' },
  { value: 'QUEUED', label: 'Queued' },
  { value: 'RUNNING', label: 'Running' },
];

export function SubmissionsHistory({
  initialChallengeId,
}: {
  initialChallengeId?: string;
}) {
  const { challenges } = useChallenges();
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [challengeFilter, setChallengeFilter] = useState(
    initialChallengeId ?? 'ALL'
  );
  const { items, total, page, pageCount, status, error, setPage, reload } =
    useSubmissions({
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      challengeId: challengeFilter === 'ALL' ? undefined : challengeFilter,
    });

  const hasFilters = statusFilter !== 'ALL' || challengeFilter !== 'ALL';

  function updateStatus(value: string) {
    setStatusFilter(value);
    setPage(0);
  }

  function updateChallenge(value: string) {
    setChallengeFilter(value);
    setPage(0);
  }

  function clearFilters() {
    setStatusFilter('ALL');
    setChallengeFilter('ALL');
    setPage(0);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-white/10 text-slate-400" variant="outline">
              {status === 'ready'
                ? `${total} total`
                : status === 'error'
                  ? 'Unavailable'
                  : 'Loading…'}
            </Badge>
            <Button
              className="h-10"
              disabled={status === 'loading'}
              onClick={() => {
                void reload();
              }}
              size="sm"
              variant="outline"
            >
              <RefreshCw
                aria-hidden
                className={status === 'loading' ? 'animate-spin' : undefined}
              />
              Refresh
            </Button>
          </div>
        }
        description="Every submission with per-test results, timing and the code that produced it."
        eyebrow="Progress"
        title="Submissions"
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <select
          aria-label="Filter by status"
          className={selectClassName}
          onChange={(event) => updateStatus(event.target.value)}
          value={statusFilter}
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by challenge"
          className={selectClassName}
          onChange={(event) => updateChallenge(event.target.value)}
          value={challengeFilter}
        >
          <option value="ALL">All challenges</option>
          {challenges.map((challenge) => (
            <option key={challenge.id} value={challenge.id}>
              {challenge.title} · {challenge.language.name}
            </option>
          ))}
        </select>
      </div>

      {hasFilters ? (
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span>Filters active</span>
          <Button
            className="h-8"
            onClick={clearFilters}
            size="sm"
            variant="ghost"
          >
            <X aria-hidden className="size-3.5" />
            Clear
          </Button>
        </div>
      ) : null}

      {status === 'loading' ? <SkeletonList /> : null}

      {status === 'error' ? (
        <ErrorState message={error} onRetry={reload} />
      ) : null}

      {status === 'ready' && items.length === 0 ? (
        <EmptyState hasFilters={hasFilters} onClear={clearFilters} />
      ) : null}

      {status === 'ready' && items.length > 0 ? (
        <>
          <Card className="border-white/5 bg-white/[0.03]">
            <CardContent className="p-0">
              <ul className="divide-y divide-white/5">
                {items.map((submission) => (
                  <li key={submission.id}>
                    <SubmissionRow submission={submission} />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
            <span>
              Page {page + 1} of {pageCount}
            </span>
            <div className="flex gap-2">
              <Button
                disabled={page <= 0}
                onClick={() => setPage(page - 1)}
                size="sm"
                variant="outline"
              >
                Previous
              </Button>
              <Button
                disabled={page + 1 >= pageCount}
                onClick={() => setPage(page + 1)}
                size="sm"
                variant="outline"
              >
                Next
              </Button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function SubmissionRow({ submission }: { submission: SubmissionSummary }) {
  const statusMeta = getSubmissionStatusMeta(submission.status);
  const difficulty = getDifficultyMeta(submission.challenge.difficulty);
  const execution = submission.execution;

  return (
    <Link
      className="flex flex-col gap-3 px-5 py-4 transition hover:bg-white/[0.03] focus-visible:bg-white/[0.03] focus-visible:outline-none sm:flex-row sm:items-center sm:justify-between"
      href={`/submissions/${submission.id}`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-medium text-slate-100">
            {submission.challenge.title}
          </p>
          <Badge className={difficulty.className} variant="outline">
            {difficulty.label}
          </Badge>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {submission.language.name} · {formatDateTime(submission.createdAt)}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 sm:justify-end">
        <Badge className={statusMeta.className} variant="outline">
          {statusMeta.label}
        </Badge>
        <span className="font-mono text-xs text-slate-400">
          {execution
            ? `${execution.testsPassed}/${execution.testsTotal} tests`
            : 'Pending'}
        </span>
        <span className="hidden font-mono text-xs text-slate-500 sm:inline">
          {execution ? formatDuration(execution.totalDurationMs) : '—'}
        </span>
        <ChevronRight aria-hidden className="size-4 text-slate-600" />
      </div>
    </Link>
  );
}

function SkeletonList() {
  return (
    <div aria-hidden className="space-y-3">
      {skeletonKeys.map((key) => (
        <div
          className="h-[74px] animate-pulse rounded-xl border border-white/5 bg-white/[0.03]"
          key={key}
        />
      ))}
    </div>
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
      <CardContent className="flex flex-col items-center gap-4 px-6 py-14 text-center">
        <span className="grid size-12 place-items-center rounded-2xl border border-rose-400/25 bg-rose-400/10 text-rose-300">
          <AlertTriangle aria-hidden className="size-5" />
        </span>
        <div>
          <p className="font-semibold">Could not load your submissions</p>
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

function EmptyState({
  hasFilters,
  onClear,
}: {
  hasFilters: boolean;
  onClear: () => void;
}) {
  return (
    <Card className="border-dashed border-white/10 bg-transparent">
      <CardContent className="flex flex-col items-center gap-4 px-6 py-16 text-center">
        <span className="grid size-14 place-items-center rounded-2xl border border-brand/20 bg-brand/10 text-brand">
          {hasFilters ? (
            <SlidersHorizontal aria-hidden className="size-6" />
          ) : (
            <ListChecks aria-hidden className="size-6" />
          )}
        </span>
        <div>
          <p className="text-lg font-semibold tracking-tight">
            {hasFilters
              ? 'No submissions match your filters'
              : 'No submissions yet'}
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-400">
            {hasFilters
              ? 'Try a different status or challenge.'
              : 'Solve a challenge and your runs will appear here with per-test feedback, duration and the final status.'}
          </p>
        </div>
        {hasFilters ? (
          <Button className="mt-2 h-11" onClick={onClear} variant="outline">
            Clear filters
          </Button>
        ) : (
          <Button asChild className="mt-2 h-11">
            <Link href="/challenges">
              Browse challenges
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
