import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { ChallengeSummary } from '@/types/challenge';
import { Code2 } from 'lucide-react';

const difficultyStyles: Record<string, { label: string; className: string }> = {
  EASY: {
    label: 'Easy',
    className: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
  },
  MEDIUM: {
    label: 'Medium',
    className: 'border-amber-300/25 bg-amber-300/10 text-amber-200',
  },
  HARD: {
    label: 'Hard',
    className: 'border-rose-400/25 bg-rose-400/10 text-rose-300',
  },
};

const fallbackDifficulty = {
  label: 'Unknown',
  className: 'border-white/10 bg-white/5 text-slate-300',
};

export function ChallengeCard({ challenge }: { challenge: ChallengeSummary }) {
  const difficulty =
    difficultyStyles[challenge.difficulty] ?? fallbackDifficulty;

  return (
    <Card className="group flex flex-col border-white/5 bg-white/[0.03] transition hover:border-brand/30 hover:bg-white/[0.05]">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <Badge className={difficulty.className} variant="outline">
            {difficulty.label}
          </Badge>
          <span className="font-mono text-[11px] text-slate-500">
            {challenge.language.name}
          </span>
        </div>
        <CardTitle className="mt-3 text-base">{challenge.title}</CardTitle>
        <CardDescription className="text-sm leading-relaxed">
          Open the challenge to read the statement, constraints and starter
          code.
        </CardDescription>
      </CardHeader>
      <CardContent className="mt-auto">
        <p className="flex items-center gap-2 border-t border-white/5 pt-4 text-xs text-slate-500">
          <Code2 aria-hidden className="size-3.5" />
          Detail view arrives in 0.6.0
        </p>
      </CardContent>
    </Card>
  );
}
