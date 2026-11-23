import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, ListChecks } from 'lucide-react';
import Link from 'next/link';

export default function SubmissionsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        description="Every submission with per-test results, timing and the code that produced it. The history view arrives in 0.7.0."
        eyebrow="Progress"
        title="Submissions"
      />

      <Card className="border-white/5 bg-white/[0.03]">
        <CardContent className="flex flex-col items-center gap-4 px-6 py-16 text-center">
          <span className="grid size-14 place-items-center rounded-2xl border border-brand/20 bg-brand/10 text-brand">
            <ListChecks aria-hidden className="size-6" />
          </span>
          <div>
            <p className="text-lg font-semibold tracking-tight">
              No submissions yet
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-400">
              Solve a challenge and your runs will appear here with per-test
              feedback, duration and the final status.
            </p>
          </div>
          <Button asChild className="mt-2 h-11">
            <Link href="/challenges">
              Browse challenges
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
