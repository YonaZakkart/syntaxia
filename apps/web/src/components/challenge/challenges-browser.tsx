'use client';

import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useChallenges } from '@/hooks/use-challenges';
import {
  AlertTriangle,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { ChallengeCard } from './challenge-card';

const PAGE_SIZE = 6;

const difficulties = [
  { value: 'ALL', label: 'All difficulties' },
  { value: 'EASY', label: 'Easy' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HARD', label: 'Hard' },
];

const selectClassName =
  'h-10 w-full rounded-lg border border-white/10 bg-panel px-3 text-sm text-slate-200 outline-none transition focus:border-brand/50 focus:ring-2 focus:ring-brand/20';

const skeletonKeys = ['first', 'second', 'third'];

export function ChallengesBrowser() {
  const { challenges, status, error, reload } = useChallenges();

  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('ALL');
  const [language, setLanguage] = useState('ALL');
  const [page, setPage] = useState(1);

  const languages = useMemo(
    () =>
      [...new Set(challenges.map((challenge) => challenge.language.name))].sort(
        (a, b) => a.localeCompare(b)
      ),
    [challenges]
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return challenges.filter((challenge) => {
      const matchesSearch =
        !query || challenge.title.toLowerCase().includes(query);
      const matchesDifficulty =
        difficulty === 'ALL' || challenge.difficulty === difficulty;
      const matchesLanguage =
        language === 'ALL' || challenge.language.name === language;

      return matchesSearch && matchesDifficulty && matchesLanguage;
    });
  }, [challenges, search, difficulty, language]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );
  const hasFilters =
    search.trim().length > 0 || difficulty !== 'ALL' || language !== 'ALL';

  function resetFilters() {
    setSearch('');
    setDifficulty('ALL');
    setLanguage('ALL');
    setPage(1);
  }

  function updateSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function updateDifficulty(value: string) {
    setDifficulty(value);
    setPage(1);
  }

  function updateLanguage(value: string) {
    setLanguage(value);
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-white/10 text-slate-400" variant="outline">
              {status === 'ready'
                ? `${filtered.length} of ${challenges.length}`
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
        description="Browse the catalog and filter by difficulty or language. The detail view and editor are the next step."
        eyebrow="Practice"
        title="Challenges"
      />

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_180px]">
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500"
          />
          <Input
            aria-label="Search challenges by title"
            className="h-10 pl-9"
            onChange={(event) => updateSearch(event.target.value)}
            placeholder="Search by title…"
            value={search}
          />
        </div>

        <select
          aria-label="Filter by difficulty"
          className={selectClassName}
          onChange={(event) => updateDifficulty(event.target.value)}
          value={difficulty}
        >
          {difficulties.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by language"
          className={selectClassName}
          onChange={(event) => updateLanguage(event.target.value)}
          value={language}
        >
          <option value="ALL">All languages</option>
          {languages.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {hasFilters ? (
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span>Filters active</span>
          <Button
            className="h-8"
            onClick={resetFilters}
            size="sm"
            variant="ghost"
          >
            <X aria-hidden className="size-3.5" />
            Clear
          </Button>
        </div>
      ) : null}

      {status === 'loading' ? <SkeletonGrid /> : null}

      {status === 'error' ? (
        <ErrorState message={error} onRetry={reload} />
      ) : null}

      {status === 'ready' && visible.length === 0 ? (
        <EmptyState hasFilters={hasFilters} onClear={resetFilters} />
      ) : null}

      {status === 'ready' && visible.length > 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((challenge) => (
              <ChallengeCard challenge={challenge} key={challenge.id} />
            ))}
          </div>

          {pageCount > 1 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-4 text-sm text-slate-400">
              <span>
                Page {currentPage} of {pageCount}
              </span>
              <div className="flex gap-2">
                <Button
                  disabled={currentPage <= 1}
                  onClick={() => setPage(Math.max(1, currentPage - 1))}
                  size="sm"
                  variant="outline"
                >
                  Previous
                </Button>
                <Button
                  disabled={currentPage >= pageCount}
                  onClick={() => setPage(Math.min(pageCount, currentPage + 1))}
                  size="sm"
                  variant="outline"
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div aria-hidden className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {skeletonKeys.map((key) => (
        <div
          className="h-48 animate-pulse rounded-xl border border-white/5 bg-white/[0.03]"
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
          <p className="font-semibold">Could not load the catalog</p>
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
      <CardContent className="flex flex-col items-center gap-4 px-6 py-14 text-center">
        <span className="grid size-12 place-items-center rounded-2xl border border-white/10 bg-white/5 text-slate-400">
          <SlidersHorizontal aria-hidden className="size-5" />
        </span>
        <div>
          <p className="font-semibold">
            {hasFilters
              ? 'No challenges match your filters'
              : 'No challenges yet'}
          </p>
          <p className="mt-1 max-w-md text-sm text-slate-400">
            {hasFilters
              ? 'Try a different title, difficulty or language.'
              : 'Run pnpm db:seed to load the starter catalog.'}
          </p>
        </div>
        {hasFilters ? (
          <Button onClick={onClear} variant="outline">
            Clear filters
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
