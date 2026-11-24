import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { ChallengeSummary } from '@/types/challenge';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { getDifficultyMeta } from './difficulty';

export function ChallengeCard({ challenge }: { challenge: ChallengeSummary }) {
  const difficulty = getDifficultyMeta(challenge.difficulty);

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
          Read the statement, constraints and starter code.
        </CardDescription>
      </CardHeader>
      <CardContent className="mt-auto">
        <Button asChild className="h-10 w-full justify-between" variant="ghost">
          <Link href={`/challenges/${challenge.id}`}>
            Open challenge
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
