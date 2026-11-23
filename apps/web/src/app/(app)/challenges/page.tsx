import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ArrowRight, Code2, Filter } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Challenges — Syntaxia',
  description:
    'Browse coding challenges and practice with a real online judge.',
};

const sampleChallenges = [
  {
    title: 'Two Sum',
    description: 'Find the two indices that add up to a target.',
    difficulty: 'Easy',
    language: 'JavaScript',
  },
  {
    title: 'Valid Parentheses',
    description: 'Decide whether a bracket sequence is balanced.',
    difficulty: 'Easy',
    language: 'Python',
  },
  {
    title: 'Merge Intervals',
    description: 'Combine overlapping ranges into disjoint intervals.',
    difficulty: 'Medium',
    language: 'C++',
  },
];

const difficultyStyles: Record<string, string> = {
  Easy: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
  Medium: 'border-amber-300/25 bg-amber-300/10 text-amber-200',
  Hard: 'border-rose-400/25 bg-rose-400/10 text-rose-300',
};

export default function ChallengesPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        actions={
          <Button className="h-10" disabled variant="outline">
            <Filter aria-hidden className="size-4" />
            Filters (soon)
          </Button>
        }
        description="Browse the catalog, filter by difficulty and language, and open a challenge to start coding. The live catalog arrives in 0.6.0."
        eyebrow="Practice"
        title="Challenges"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sampleChallenges.map((challenge) => (
          <Card
            className="border-white/5 bg-white/[0.03] transition hover:border-brand/30 hover:bg-white/[0.05]"
            key={challenge.title}
          >
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <Badge
                  className={difficultyStyles[challenge.difficulty]}
                  variant="outline"
                >
                  {challenge.difficulty}
                </Badge>
                <span className="font-mono text-[11px] text-slate-500">
                  {challenge.language}
                </span>
              </div>
              <CardTitle className="mt-3 text-base">
                {challenge.title}
              </CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                {challenge.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                asChild
                className="h-10 w-full justify-between"
                variant="ghost"
              >
                <Link href="/challenges">
                  Preview
                  <ArrowRight aria-hidden className="size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-dashed border-white/10 bg-transparent">
        <CardContent className="flex flex-col gap-3 p-6 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-brand/20 bg-brand/10 text-brand">
              <Code2 aria-hidden className="size-5" />
            </span>
            <div>
              <p className="font-medium text-slate-200">
                The API is already live
              </p>
              <p className="mt-1 leading-relaxed">
                <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-xs text-slate-300">
                  GET /api/challenges
                </code>{' '}
                and{' '}
                <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-xs text-slate-300">
                  GET /api/challenges/:id
                </code>{' '}
                are ready. The catalog, filters and detail view land in 0.6.0.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
