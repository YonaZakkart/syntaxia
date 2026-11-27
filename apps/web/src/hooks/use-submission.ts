'use client';

import { useAuth } from '@/components/auth/auth-provider';
import {
  type SubmissionDetail,
  type SubmissionDetailResponse,
  isFinalSubmissionStatus,
} from '@/types/submission';
import { useCallback, useEffect, useRef, useState } from 'react';

const POLL_INTERVAL_MS = 2000;
const POLL_DEADLINE_MS = 180_000;

export type SubmissionDetailStatus =
  | 'loading'
  | 'ready'
  | 'error'
  | 'not-found';

export function useSubmission(id: string) {
  const { authFetch } = useAuth();
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [status, setStatus] = useState<SubmissionDetailStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const pollStartedAtRef = useRef<number | null>(null);

  const fetchSubmission = useCallback(async () => {
    const response = await authFetch(
      `/api/submissions/${encodeURIComponent(id)}`
    );

    if (response.status === 404 || response.status === 400) {
      return null;
    }

    const body = (await response
      .json()
      .catch(() => null)) as SubmissionDetailResponse | null;

    if (!response.ok || !body?.success || !body.data) {
      throw new Error(body?.error ?? 'Unable to load the submission');
    }

    return body.data;
  }, [authFetch, id]);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    pollStartedAtRef.current = Date.now();

    try {
      const data = await fetchSubmission();

      if (!data) {
        setSubmission(null);
        setStatus('not-found');
        return;
      }

      setSubmission(data);
      setStatus('ready');
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load the submission'
      );
      setStatus('error');
    }
  }, [fetchSubmission]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!submission || isFinalSubmissionStatus(submission.status)) return;

    const startedAt = pollStartedAtRef.current ?? Date.now();
    if (Date.now() - startedAt > POLL_DEADLINE_MS) return;

    const timer = setTimeout(async () => {
      try {
        const data = await fetchSubmission();
        if (data) setSubmission(data);
      } catch {
        // Keep the last known state; the next tick retries.
      }
    }, POLL_INTERVAL_MS);

    return () => clearTimeout(timer);
  }, [submission, fetchSubmission]);

  return { submission, status, error, reload: load };
}
