import { SubmissionsHistory } from '@/components/submission/submissions-history';
import type { Metadata } from 'next';

const idPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const metadata: Metadata = {
  title: 'Submissions — Syntaxia',
  description: 'Review your submissions and per-test results.',
};

export default async function SubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ challengeId?: string | string[] }>;
}) {
  const params = await searchParams;
  const challengeId =
    typeof params.challengeId === 'string' && idPattern.test(params.challengeId)
      ? params.challengeId
      : undefined;

  return <SubmissionsHistory initialChallengeId={challengeId} />;
}
