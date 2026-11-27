import { SubmissionDetailView } from '@/components/submission/submission-detail';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Submission — Syntaxia',
  description: 'Review a submission with its per-test results and code.',
};

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <SubmissionDetailView submissionId={id} />;
}
