import { ChallengesBrowser } from '@/components/challenge/challenges-browser';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Challenges — Syntaxia',
  description:
    'Browse coding challenges and practice with a real online judge.',
};

export default function ChallengesPage() {
  return <ChallengesBrowser />;
}
