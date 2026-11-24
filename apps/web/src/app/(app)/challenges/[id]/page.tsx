import { ChallengeDetail } from '@/components/challenge/challenge-detail';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Challenge — Syntaxia',
  description:
    'Read the statement, starter code, public tests and limits for this challenge.',
};

export default async function ChallengeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <ChallengeDetail challengeId={id} />;
}
